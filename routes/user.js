
const express = require('express');
const bcrypt = require('bcrypt');
const  { User, Post } = require('../models');
const { isLoggedIn, isNotLoggedIn } = require('./middlewares');

const passport = require('passport');

const router = express.Router();


router.get('/', async (req, res, next) => {   // 새로고침할 때, 프론트에서 로그인이 풀리지 않았지만 풀려보이는 것을 방지, 업데이트 정보 보여주기
   
    try {
        if(req.user) {
            const fullUserWithoutPass = await User.findOne({
                where: { id: req.user.id },
                attributes: {
                    exclude: ['password']
                },
                include: [{
                    model: Post,
                    attributes: ['id'],
                }, {
                    model: User,
                    as: 'Followings',
                    attributes: ['id'],
                }, {
                    model: User,
                    as: 'Followers',
                    attributes: ['id'],

                }]
            })
            return res.status(200).json(fullUserWithoutPass);
        }else {
            res.status(200).json(null);
        }
    }catch(err) {
        console.error(err);
        next(err);
    }
    
})  

router.post('/login', isNotLoggedIn, (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
        if(err) {
            console.error(err);
            return next(err);
        }
        if(info) {
            return res.status(401).send(info.reason);
        }
        return req.login(user, async( loginerr) => {
            if(loginerr) {
                console.error(loginerr);
                return next(loginerr);
            }
            const fullUserWithoutPass = await User.findOne({
                where: { id: user.id },
                attributes: {
                    exclude: ['password']
                },
                include: [{
                    model: Post,
                    attributes: ['id'],
                }, {
                    model: User,
                    as: 'Followings',
                    attributes: ['id'],
                }, {
                    model: User,
                    as: 'Followers',
                    attributes: ['id'],
                }]
            })
            return res.status(200).json(fullUserWithoutPass);
        });
    })(req, res, next);
})


router.post('/', isNotLoggedIn ,async (req, res, next) => {
    try{
        const exUser = await User.findOne({
          where: {
            email: req.body.email,
          }  
        });
        if(exUser) {
            return res.status(403).send('이미 사용중인 이메일입니다.');
        }
        const hashedPassword = await bcrypt.hash(req.body.password, 12);
        await User.create({
            email: req.body.email,
            nickname: req.body.nickname,
            password: hashedPassword,
        });
        res.status(200).send('ok');
    }catch(err) {
        console.error(err);
        next(err);
    }
})

router.post('/logout', isLoggedIn , (req, res) => {
    req.logout();
    req.session.destroy();
    res.send('ok');
})

router.patch('/nickname', isLoggedIn, async(req, res, next) => {
    try {
        await User.update({
            nickname: req.body.nickname,
        }, {
            where: {id: req.user.id},
        });
        res.status(200).json({ nickname: req.body.nickname });
    }catch(err) {
        console.error(err);
        next(err);
    }
})

router.patch('/:userId/follow', isLoggedIn, async(req, res, next) => { // PATCH /user/1/follow

    try {
        const user = await User.findOne({ where: {id: req.params.userId }});
        if(!user) {
            res.status(403).send('해당 회원이 없습니다.');
        }
        await user.addFollowers(req.user.id);
        res.status(200).json({ UserId: parseInt(req.params.userId, 10) });
    }catch(err) {
        console.error(err);
        next(err);
    }
});

router.delete('/:userId/follow', isLoggedIn, async(req, res, next) => { // DELETE /user/1/follow  =>  userid의 입장에서 나를 팔로워로 제거
    try {
        const user = await User.findOne({ where: {id: req.params.userId }});
        if(!user) {
            res.status(403).send('해당 회원이 없습니다.');
        }
        await user.removeFollowers(req.user.id);
        res.status(200).json({ UserId: parseInt(req.params.userId, 10) });
    }catch(err) {
        console.error(err);
        next(err);
    }
});

router.delete('/follower/:userId', isLoggedIn, async(req, res, next) => { // DELETE /user/follower/2 => userid의 입장에서 나를 팔로잉으로 제거
    try {
        const user = await User.findOne({ where: {id: req.params.userId }});
        if(!user) {
            res.status(403).send('해당 회원이 없습니다.');
        }
        await user.removeFollowings(req.user.id);
        res.status(200).json({ UserId: parseInt(req.params.userId, 10) });
    }catch(err) {
        console.error(err);
        next(err);
    }
});
router.get('/followers', isLoggedIn, async(req, res, next) => { // GET /user/followers 내 팔로워 목록 얻기

    try {
        const user = await User.findOne({ where: {id: req.user.id }});
        if(!user) {
            res.status(403).send('해당 회원이 없습니다.');
        }
        const followers = await user.getFollowers(); // 나를 찾고 getFollowers() 
        res.status(200).json(followers);
    }catch(err) {
        console.error(err);
        next(err);
    }
});

router.get('/followings', isLoggedIn, async(req, res, next) => { // GET /user/followings 내 팔로잉 목록 얻기

    try {
        const user = await User.findOne({ where: {id: req.user.id }});
        if(!user) {
            res.status(403).send('해당 회원이 없습니다.');
        }
        const followings = await user.getFollowings();
        res.status(200).json(followings);
    }catch(err) {
        console.error(err);
        next(err);
    }
});



module.exports = router;