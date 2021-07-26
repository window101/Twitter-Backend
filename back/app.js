
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');
const dotenv = require('dotenv');
const morgan = require('morgan');
const path = require('path');
const cookieParser = require('cookie-parser');
const hpp = require('hpp');
const helmet = require('helmet');

const postRouter = require('./routes/post');
const postsRouter = require('./routes/posts');
const userRouter = require('./routes/user');
const hashtagRouter = require('./routes/hashtag');
const authRouter = require('./routes/auth');

const db = require('./models');
const passportConfig = require('./passport');

dotenv.config();
const app = express();
db.sequelize.sync()
    .then(() => {
        console.log('db 연결 성공');
    })
    .catch(console.error);

passportConfig();

if(process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
    app.use(morgan('combined'));
    app.use(hpp());
    app.use(helmet());
    app.use(cors({
        origin: 'https://nodebird.com', // 도메인이 다르고 쿠키 공유 시, 정확한 주소를 적어야함 
        credentials: true, // 도메인이 달라도 쿠키 전달 허용
    }));
}else {
    app.use(morgan('dev'));
    app.use(cors({
        origin: true,  
        credentials: true, 
    }));
}


app.use('/', express.static(path.join(__dirname, 'uploads')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(session({
    saveUninitialized: false,
    resave: false,
    secret: process.env.COOKIE_SECRET,
    proxy: true,
    cookie: {
        httpOnly: true,
        secure: true,
        domain: process.env.NODE_ENV === 'production' && '.nodebird.com'
    },
}));
app.use(passport.initialize());
app.use(passport.session());


app.use('/post', postRouter);
app.use('/posts', postsRouter);
app.use('/user', userRouter);    
app.use('/hashtag', hashtagRouter);
app.use('/auth', authRouter);



app.listen(3065, () => {
    console.log('서버 실행 중');
});