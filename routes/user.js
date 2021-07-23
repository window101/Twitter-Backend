
const express = require('express');
const bcrypt = require('bcrypt');
const  { User, Post } = require('../models');

const passport = require('passport');

const router = express.Router();

router.post('/login', (req, res, next) => {
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
                }, {
                    model: User,
                    as: 'Followings',
                }, {
                    model: User,
                    as: 'Followers',
                }]
            })
            return res.status(200).json(user);
        });
    })(req, res, next);
})


router.post('/', async (req, res, next) => {
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

router.post('/logout', (req, res) => {
    req.logout();
    req.session.destroy();
    res.send('ok');
})


module.exports = router;