

module.exports = (sequelize, DataTypes) => {
    const Comment = sequelize.define('Comment', { 
        content: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        // BelongsTo가 들어가면 UserId, PostId와 같은 컬럼이 자동생성된다
    }, {
        charset: 'utf8mb4',
        collate: 'utf8mb4_general_ci',
    });
    Comment.associate = (db) => {
        db.Comment.belongsTo(db.User);
        db.Comment.belongsTo(db.Post);
    };
    return Comment;
}