
const express =require('express');
const { Op } = require('sequelize');
const router = express.Router();
const { Post, Hashtag, Image, Comment, User} = require('../models');

router.get('/:hashtag', async (req, res, next) => {   // GET /hashtag/노드    해쉬테그로 게시글 검색
    try {
        const where = {};
        if(parseInt(req.query.lastId, 10)) { //초기 로딩이 아닐때
            where.id = { [Op.lt]: parseInt(req.query.lastId, 10) }
        }
        const posts = await Post.findAll({
            where: where,   // 그냥 where로 해도댐
            limit: 10,
            order: [
                ['createdAt', 'DESC'],
                [Comment, 'createdAt', 'DESC'],  // 댓글 내림차순 정렬
            ],
            include: [{
                model: Hashtag,
                where: { name: decodeURIComponent(req.params.hashtag)}, // 한글검색 가능하게
            },{
                model: User,
                attributes: ['id', 'nickname'],
            }, {
                model: Image,
            }, {
                model: Comment,
                include:[{
                    model: User,
                    attributes: ['id', 'nickname'],
                    order: [['createdAt', 'DESC']],
                }],
            }, {
                model: User,  // 좋아요 누른 사람
                as: 'Likers',
                attributes: ['id'],
            }, {
                model: Post,
                as: 'Retweet',
                include: [{
                    model: User,
                    attributes: ['id', 'nickname'],
                }, {
                    model: Image,
                }]
            }], 

        });
        res.status(200).json(posts);
    }catch(err) {
        console.error(err);
        next(err);
    }
    
});
module.exports = router;