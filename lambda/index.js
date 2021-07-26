// 이미지 리사이징 

// 사용자가 올린 이미지를 바로 S3에 올리지 않고, lambda 함수를 통해 리사이징 후 S3에 올림

const AWS = require('aws-sdk');
const sharp = require('sharp');

const s3 = new AWS.S3();

exports.handler = async (event, context, callback) => {
    const Bucket = event.Records[0].s3.bucket.name;  //react-nodebird-s3
    const Key = decodeURIComponent(event.Records[0].s3.object.key);  // original/12312312_abc.png
    const filename = Key.split('/')[Key.split('/').length-1];
    const ext = Key.split('.')[Key.split('.').length-1].toLowerCase();

    const requiredFormat = ext === 'jpg' ? 'jpeg' : ext;  // jpg가 업로드되면, jpeg로 변환

    try {
        const s3Object = await s3.getObject({ Bucket, Key}).promise();
        const resizedImage = await sharp(s3Object.body)
            .resize(400, 400, { fit: 'inside'})
            .toFormat(requiredFormat)
            .toBuffer();
        await s3.putObject({
            Bucket,
            Key: `thumb/${filename}`,
            Body: resizedImage,
        }).promise();
        return callback(null, `thumb/${filename}`);

    }catch(err) {
        console.error(err);
        return callback(err);
    }
};