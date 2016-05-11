var express = require('express');
var redis = require('redis');
var redisClient = redis.createClient();
var router = express.Router();
var _ = require('underscore');
var GoogleSpreadsheet = require("google-spreadsheet");
var balloonBlowSpeedSheet = new GoogleSpreadsheet('1GDBrKUfyqo4LAK0BuSyjJ6FETMj3yljxUVyHYCLnPxk');
var gameLevelRatioSheet = new GoogleSpreadsheet('1KcXl1hRoJ-xL4yqOo1ahf8WjG-dVfspZTPp1Akt15Yc');
var hasStarByLevel = new GoogleSpreadsheet('1k-xgKpJYQkgZH8nrSS8qx0KZ3BoSDvo-ys6LWV6hV1c');

const ERROR_SHEET = 101;
const ERROR_SERVER = 202;
const SUCCEED_INIT_DB = 701;
const ERROR_WRONG_INPUT = 505;
const SUCCEED_REQUEST = 704;


var message = {};
message[ERROR_SHEET] = "구글 스프레드시트 오류";
message[SUCCEED_INIT_DB] = "DB 초기화 성공";
message[ERROR_SERVER] = "서버연결 실패";
message[ERROR_WRONG_INPUT] = "입력값 오류";
message[SUCCEED_REQUEST] = "요청 응답 성공";

function sendErrorMessage(res, error) {
    res.send({errorCode: error, errorMessage: message[error]});
}

function sendSucceedMessage(res, succeedMessage) {
    res.send({succeedCode: succeedMessage, succeedMessage: message[succeedMessage]});
}

function sendData(res, succeedMessage, sendData) {
    res.send({succeedCode: succeedMessage, succeedMessage: message[succeedMessage], data: sendData});
}

function consoleErrorMessage(errorMessage) {
    console.log({errorCode: errorMessage, errorMessage: message[errorMessage]});
}
function consoleSucceedMessage(succeedMessage) {
    console.log({succeedCode: succeedMessage, succeedMessage: message[succeedMessage]});
}

function consoleSendData(succeedMessage, sendData) {
    console.log({succeedCode: succeedMessage, succeedMessage: message[succeedMessage], data: sendData})
}

function consoleInputLog(body) {
    console.log(body);
}


function getGameBlowSpeed() {
    return 'gameBlowSpeed';
}

function getGameLevelRatio() {
    return 'gameLevelRatio';
}

function getUserInfo(userId) {
    return 'userInfo:' + userId;
}
function getHasStarByLevel() {
    return 'hasStarByLevel';
}
function getLevel() {
    return 'level';
}

/**
 *
 * 게임에 필요한 기본 정보 db 초기화
 *
 */

router.get('/initBalloonBlowSpeedInfo', function (req, res) {

    balloonBlowSpeedSheet.getRows(1, function (err, rowData) {
        if (err) {
            sendErrorMessage(res, ERROR_SHEET);
            consoleErrorMessage(ERROR_SERVER);
            return;
        }

        var rowKeys = Object.keys(rowData);

        rowKeys.forEach(function (key) {
            var keys = Object.keys(rowData[key]);

            var multi = redisClient.multi();
            multi.select(1)
                .hset(getGameBlowSpeed(), 'base', rowData[key][keys[3]])
                .hset(getGameBlowSpeed(), 'full', rowData[key][keys[4]])
                .hset(getGameBlowSpeed(), 'delay', rowData[key][keys[5]])
                .exec(function (err) {
                    if (err) {
                        sendErrorMessage(res, ERROR_SERVER);
                        consoleErrorMessage(ERROR_SERVER);
                        return;
                    }
                });

            sendSucceedMessage(res, SUCCEED_INIT_DB);
            consoleSucceedMessage(SUCCEED_INIT_DB);

        });
    });
});


/**
 *
 * 레벨 부여 비율 db 초기화 함수
 *
 */

router.get('/initLevelRatio', function (req, res) {

    gameLevelRatioSheet.getRows(1, function (err, rowData) {

        if (err) {
            sendErrorMessage(res, ERROR_SHEET);
            consoleErrorMessage(ERROR_SERVER);
            return;
        }

        var rowKeys = Object.keys(rowData);

        rowKeys.forEach(function (key) {
            var keys = Object.keys(rowData[key]);

            var multi = redisClient.multi();
            multi.select(1)
                .hset(getGameLevelRatio(), rowData[key][keys[3]], rowData[key][keys[4]])
                .exec(function (error) {
                    if (err) {
                        sendErrorMessage(res, ERROR_SERVER);
                        consoleErrorMessage(ERROR_SERVER);
                        return;
                    }
                });
        });
        sendSucceedMessage(res, SUCCEED_INIT_DB);
        consoleSucceedMessage(SUCCEED_INIT_DB);
    });
});

/**
 *
 * 레벨별 별 소유 개수 db 초기화 함수
 *
 */

router.get('/initHasStarByLevel', function (req, res) {

    hasStarByLevel.getRows(1, function (err, rowData) {

        if (err) {
            sendErrorMessage(res, ERROR_SHEET);
            consoleErrorMessage(ERROR_SERVER);
            return;
        }

        var rowKeys = Object.keys(rowData);

        rowKeys.forEach(function (key) {
            var keys = Object.keys(rowData[key]);

            var multi = redisClient.multi();
            multi.select(1)
                .hset(getHasStarByLevel(), rowData[key][keys[3]], rowData[key][keys[4]])
                .exec(function (err) {
                    if (err) {
                        sendErrorMessage(res, ERROR_SERVER);
                        consoleErrorMessage(ERROR_SERVER);
                        return;
                    }
                });
        });

        sendSucceedMessage(res, SUCCEED_INIT_DB);
        consoleSucceedMessage(SUCCEED_INIT_DB);
    });
});

/**
 *
 * 유저 레벨에 따른 별 보유개수 요청
 *
 * @id
 *
 */

router.post('/userHaveStarNumber', function (req, res) {
    consoleInputLog(req.body);
    var id = req.body.id;
    if (!id) {
        sendErrorMessage(res, ERROR_WRONG_INPUT);
        consoleErrorMessage(ERROR_WRONG_INPUT);
        return;
    }

    var multi = redisClient.multi();
    multi.select(0)
        .hget(getUserInfo(id), getLevel())
        .exec(function (err, rep) {
            if (err) {
                sendErrorMessage(res, ERROR_SERVER);
                consoleErrorMessage(ERROR_SERVER);
                return;
            }

            var userLevel = rep[1];

            var multi = redisClient.multi();
            multi.select(1)
                .hget(getHasStarByLevel(), userLevel)
                .exec(function (err, reply) {
                    if (err) {
                        sendErrorMessage(res, ERROR_SERVER);
                        consoleErrorMessage(ERROR_SERVER);
                        return;
                    }

                    var userHaveStarNumber = reply[1];

                    sendData(res, SUCCEED_REQUEST, userHaveStarNumber);
                    consoleSendData(SUCCEED_REQUEST, userHaveStarNumber);
                });
        });
});


module.exports = router;
