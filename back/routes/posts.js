
const express = require('express');
const { Op } = require('sequelize');

const router = express.Router();
const { Post, User, Image, Comment } = require('../models');

router.get('/', async (req, res, next) => {   // GET /posts  게시글 여러개 가져오기
    try {
        const where = {};
        if(parseInt(req.query.lastId, 10)) { //초기 로딩이 아닐때
            where.id = { [Op.lt]: parseInt(req.query.lastId, 10) }
        }
        const posts = await Post.findAll({
            where,
            limit: 10,
            order: [
                ['createdAt', 'DESC'],
                [Comment, 'createdAt', 'DESC'],  // 댓글 내림차순 정렬
            ],
            include: [{
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