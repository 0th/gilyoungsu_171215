const express = require('express');
const router = express.Router();
const redis = require('redis');
const redisClient = redis.createClient(6379, '127.0.0.1');
redisClient.select(0);

const _ = require('underscore');

const OK = 0;
const ERROR_DATABASE = 101;
const NOT_EXIST_FANDOM_DATA = 102;

const message = {};
message[ERROR_DATABASE] = '데이터 베이스 에러';
message[OK] = 'OK';
message[NOT_EXIST_FANDOM_DATA] = '팬덤 데이터가 존재하지 않습니다';

function getFandomBalloonRank(fandomName) {
    return 'fandomBalloonRank:' + fandomName;
}

function getFandomRank() {
    return 'fandomRank';
}

function getFandomUserNumber() {
    return 'fandomUserNumber';
}

function getUserRank(fandomName) {
    return 'userRank:' + fandomName;
}

function sendReply(res, err, reply) {
    if (_.isEmpty(reply))
        reply = {};

    switch (err) {
        case ERROR_DATABASE :
            reply.errorCode = err;
            reply.errorMessage = message[err];

        case NOT_EXIST_FANDOM_DATA:
            reply.errorCode = err;
            reply.errorMessage = message[err];

        default:
            reply.errorCode = 0;
            reply.errorMessage = 'OK';
    }

    res.send(reply);
}


router.get('/', function (req, res) {
    redisClient.zrevrange(getFandomRank(), 0, -1, 'withscores', function (err, allFandomRank) {
        if (err) {
            sendReply(res, ERROR_DATABASE);
            return;
        }
        if (_.isEmpty(allFandomRank)) {
            sendReply(res, NOT_EXIST_FANDOM_DATA);
            return;
        }

        const fandoms = [];

        for (let i = 0; i < allFandomRank.length; i = i + 2) {
            const fandomData = {};
            fandomData.fandomName = allFandomRank[i];
            fandomData.score = allFandomRank[i + 1];
            fandoms.push(fandomData);
        }

        const multi = redisClient.multi();

        _.each(fandoms, function (fandom) {
            multi.zrevrange(getFandomBalloonRank(fandom.fandomName), 0, 0)
                .zrevrange(getUserRank(fandom.fandomName), 0, 0)
                .zscore(getFandomUserNumber(), fandom.fandomName);
        });

        multi.exec(function (err, reply) {
            if (err) {
                sendReply(res, ERROR_DATABASE);
                return;
            }

            const fandomData = [];

            fandoms.forEach(function (each, index) {
                const data = fandoms[index];

                data.firstBalloon = reply[index * 3];
                let firstUserId = reply[(index * 3) + 1];

                if (firstUserId.length != 0) {
                    const firstUserIds = firstUserId.toString().split(':');
                    firstUserId = firstUserIds[2];
                }

                data.firstUser = firstUserId;
                data.userNum = reply[(index * 3) + 2] == null ? 0 : reply[index * 3 + 2];

                fandomData.push(data);
            });

            sendReply(res, null, {data: fandomData});
        });
    });
});

module.exports = router;
