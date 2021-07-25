
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { Image, Post, Comment, User, Hashtag } = require('../models');
const { isLoggedIn, isNotLoggedIn } = require('./middlewares');


const router = express.Router();

try {
    fs.accessSync('uploads', constants.R_OK | constants.W_OK);
}catch(error) {
    fs.mkdirSync('uploads');
}

const upload = multer({   // 각각의 라우터마다 단일 이미지, 여러개 이미지 업로드하는 것과 같이 다르기 때문에 라우터마다 설정해준다.
    storage: multer.diskStorage({
        destination(req, file, done) {
            done(null, 'uploads');
        },
        filename(req, file, done) {
            const ext = path.extname(file.originalname); // 확장자 추출(.png)
            const basename = path.basename(file.originalname, ext); // 파일 이름 추출
            done(null, basename + '_' + new Date().getTime() + ext);
        },
    }),
    limits: { fileSize: 20 * 1024 * 1024 },
});

router.post('/', isLoggedIn , upload.none(), async (req, res, next) => {   // POST /post
    try {
        const hashtags = req.body.content.match(/#[^\s#]+/g);
        const post = await Post.create({
            content: req.body.content,
            UserId: req.user.id,
        });
        if(hashtags) {
            const result = await Promise.all(hashtags.map((tag) => Hashtag.findOrCreate({ 
                where: {name: tag.slice(1).toLowerCase() },
            }))); // 없을때만 등록 [[노드, true], [익스프레스, false]]
            await post.addHashtags(result.map((v) => v[0]));
        }
        if(req.body.image) {
            if(Array.isArray(req.body.image)) { // 이미지를 여러개 올리면 image: [안녕하세요.png, 그래요.png]
                const images = await Promise.all(req.body.image.map((image) => Image.create({ src: image })));  // 결과가 Promise의 배열이라서 Promise.all을 써서 한방에 db에 저장
                await post.addImages(images);
            }else { // 이미지를 하나만 올리면 image: 안녕하세요.png
                const image = await Image.create({ src: req.body.image });
                await post.addImages(images);
            }
        }
        const fullPost = await Post.findOne({ // 부분적인 post 정보만 돌려주면 프론트에서 에러가 남.
            where: {id: post.id },
            include: [{
                model: Image,
            }, {
                model: Comment,
                include: [{
                    model: User,
                    attributes: ['id', 'nickname'],
                }]
            }, {
                model: User, // 게시글 작성자
                attributes: ['id', 'nickname'],
            }, {
                model: User,  // 좋아요 누른 사람
                as: 'Likers',
                attributes: ['id'],
            }]
        })
        res.status(201).json(fullPost);
    } catch(error) {
        console.error(error);
        next(error);
    }
    
});



router.post('/images', isLoggedIn, upload.array('image'), async(req, res, next) => {  // POST /post/images  이미지들만 업로드용 라우터 
    // async(req, res, next) 는 서버에 이미지를 먼저 업로드 후에 실행된다.
    /* 이렇게 하면 이미지만 먼저 서버에 업로드되어서, 작성자가 내용을 적을 때 이미지 파일 ex. [안녕하세요.png] 처럼 미리보기가 가능하다
    그러나, 위와 같은 요청을 2번 보내는 방식은 사용자가 내용을 작성하지 않을 수도 있는데 그래도 해당 이미지는 보관되며 나중에 머신러닝을 돌릴 때도 활용한다. 
    */
    //console.log(req.files);

    res.json(req.files.map((v) => v.filename));
});

router.get('/:postId', async (req, res, next) => {  // 특정 게시글 불러오기
    try {
        const post = await Post.findOne({
            where: {id: req.params.postId},
        });
        if(!post) {
            return res.status(404).send('존재하지 않는 게시글입니다.');
        }
        const fullPost = await Post.findOne({
            where: {id: post.id},
            include: [{
                model: Post,
                as: 'Retweet',
                include: [{
                    model: User,
                    attributes: ['id', 'nickname'],
                }, {
                    model: Image,
                }]
            }, {
                model: User,
                attributes: ['id', 'nickname']
            }, {
                model: User,
                as: 'Likers',
                attributes: ['id', 'nickname'],
            }, {
                model: Image,
            }, {
                model: Comment,
                include: [{
                    model: User,
                    attributes: ['id', 'nickname'],
                }]
            }]
        })
        return res.status(201).json(fullPost);
    }catch(err) {
        console.error(err);
        next(err);
    } 
});

router.post('/:postId/comment', isLoggedIn , async(req, res, next) => {  // POST /1/comment  댓글작성
    try {
        const post = await Post.findOne({
            where: {id: req.params.postId}
        })
        if(!post) {
            return res.status(403).send('존재하지 않는 게시글입니다.');
        }
        const comment = await Comment.create({
            content: req.body.content,
            PostId: req.params.postId,
            UserId: req.user.id,
        });
        const fullComment = await Comment.findOne({
            where: { id: comment.id },
            include: [{
                model: User,
                attributes: ['id', 'nickname'],
            }]
        })
        res.status(201).json(comment);
    }catch(err) {
        console.error(err);
        next(err);
    }
});

router.post('/:postId/retweet', isLoggedIn , async(req, res, next) => {  // POST /post/1/retweet 
    try {
        const post = await Post.findOne({
            where: {id: req.params.postId},
            include: [{
                model: Post,
                as: 'Retweet',
            }],
        })
        if(!post) {
            return res.status(403).send('존재하지 않는 게시글입니다.');
        }
        if(req.user.id === post.UserId && (post.Retweet && post.Retweet.UserId === req.user.id)) { // 자기글을 리트윗하거나, 자기글을 리트윗한 사람의 글을 다시 내가 리트윗하는 경우
            return res.status(403).send('자신의 글은 리트윗할 수 없습니다.');
        }
        const retweetTargetId = post.RetweetId || post.id;
        const exPost = await Post.findOne({ // 내가 이미 리트윗한 경우
            where: {
                UserId: req.user.id,
                RetweetId: retweetTargetId,
            }
        });
        if(exPost) {
            return res.status(403).send('이미 리트윗했습니다.');
        }
        const retweet = await Post.create({
            UserId: req.user.id,
            RetweetId: retweetTargetId,
            content: 'retweet',
        });
        const retweetWithPrevPost = await Post.findOne({
            where: {id: retweet.id},
            include: [{
                model: Post,
                as: 'Retweet',
                include: [{
                    model: User,
                    attributes: ['id', 'nickname'],
                }, {
                    model: Image,
                }]
            }, {
                model: User,
                attributes: ['id', 'nickname'],
            }, {
                model: Image,
            }, {
                model: Comment,
                include: [{
                    model: User,
                    attributes: ['id', 'nickname'],
                }]
            }, {
                model: User,
                as: 'Likers',
                attributes: ['id'],
            }]
        });
        return res.status(201).json(retweetWithPrevPost);
    }catch(err) {
        console.error(err);
        next(err);
    }
});
router.patch('/:postId/like', isLoggedIn, async (req, res, next) => {  // PATCH /post/1/like

    try {
        const post = await Post.findOne({ where: {id: req.params.postId }});
        if(!post) {
            return res.status(403).send('게시글이 존재하지 않습니다.');
        }
        await post.addLikers(req.user.id);
        res.json({ PostId: post.id, UserId: req.user.id });
    }catch(error) {
        console.error(error);
        next(error);
    }
    
})

router.delete('/:postId/like', isLoggedIn, async (req, res, next) => {  // DELETE /post/1/like
    try {
        const post = await Post.findOne({ where: {id: req.params.postId }});
        if(!post) {
            return res.status(403).send('게시글이 존재하지 않습니다.');
        }
        await post.removeLikers(req.user.id);
        res.json({ PostId: post.id, UserId: req.user.id });
    }catch(error) {
        console.error(error);
        next(error);
    }
})

router.delete('/:postId', async (req, res, next) => {  // DELETE /post/10 
    try {
        await Post.destroy({
            where: { 
                id: req.params.postId,
                UserId: req.user.id,    // 게시글 작성자와 지우려는 사람이 같아야
            },
        });
        res.json({ PostId: parseInt(req.params.postId, 10) });
    }catch(err) {
        console.error(err);
        next(err);
    }
});




module.exports = router;