
const express = require('express');
const nodemailer = require('nodemailer');

const router = express.Router();

router.post('/nodemailerTest', (req, res, next) => {
    let email = req.body.email;

    let transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'sksehr1234@gmail.com',
            pass: 'ghkwns12@@',
        }
    });

    let mailOptions = {
        from: 'sksehr1234@gmail.com',
        to : email,
        subject: '[Nodebird] 회원가입 인증코드 입니다.',
        text: '입력하세요.',
    }

    transporter.sendMail(mailOptions, (err, info) => {
        if(err) {
            console.error(err);
            next(err);
        } else {
            console.log('Email sent: ' + info.response)
            res.status(200).json('전송완료');
        }
    })
});

module.exports = router;
