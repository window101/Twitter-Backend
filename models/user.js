

module.exports = (sequelize, DataTypes) => {
    const User = sequelize.define('User', { // mysql에는 users 라고 저장됨
        email: {
            type: DataTypes.STRING(30),
            allowNull: false,  // 필수
            unique: true,  // 고유한 값
        },
        nickname: {
            type: DataTypes.STRING(30),
            allowNull: false,
        },
        password: {
            type: DataTypes.STRING(100),
            allowNull: false,
        },
    }, {
        charset: 'utf8',
        collate: 'utf8_general_ci',
    });
    User.associate = (db) => {
        db.User.hasMany(db.Post);
        db.User.hasMany(db.Comment);
        db.User.belongsToMany(db.Post, {through: 'Like', as: 'Liked' })
        db.User.belongsToMany(db.User, {through: 'Follow', as: 'Followers' , foreignKey: 'FollowingId' }); 
        db.user.belongsToMany(db.User, {through: 'Follow', as: 'Followings', foreignKey: 'FollowerId' });
        //through : 테이블 이름 변경, foreignKey: 컬럼 키이름 변경

    };
    return User;
}