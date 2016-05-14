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
const GAME_BOARD = 36;

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

function getFieldCoinCount() {
    return 'coinCount';
}

function getFieldBalloonCount() {
    return 'balloonCount';
}

function getFieldStarCount() {
    return 'starCount';
}

function getUserGameInfo(userId, index) {
    return 'userGameInfo:' + userId + ':' + index;
}

/**
 *
 * 게임에 필요한 기본 정보 db 초기화
 *
 */

function getFieldBase() {
    return 'base';
}
function getFieldFull() {
    return 'full';
}
function getFieldDelay() {
    return 'delay';
}
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
                .hset(getGameBlowSpeed(), getFieldBase(), rowData[key][keys[3]])
                .hset(getGameBlowSpeed(), getFieldFull(), rowData[key][keys[4]])
                .hset(getGameBlowSpeed(), getFieldDelay(), rowData[key][keys[5]])
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

/**
 *
 * 게임 끝난 후 요청
 *
 * @userId
 * @userGetStarCount
 * @userGetCoinCount
 * @userGetBalloonCount
 * @competitorId
 * @competitorGameInfo
 *
 */

router.post('/gameOver', function (req, res) {
    consoleInputLog(req.body);

    var userId = req.body.userID;
    var userGetStarCount = req.body.userGetStarCount;
    var userGetCoinCount = req.body.userGetCoinCount;
    var userGetBalloonCount = req.body.userGetBalloonCount;
    var competitorId = req.body.competitorId;
    var competitorGameInfo = req.body.competitorGameInfo;

    if (!userId || !userGetStarCount || !userGetCoinCount
        || !userGetBalloonCount || !competitorId || !competitorGameInfo) {
        consoleErrorMessage(ERROR_WRONG_INPUT);
        sendErrorMessage(res, ERROR_WRONG_INPUT);
        return;
    }

    var multi = redisClient.multi();
    multi.select(0)
        .hincrby(getUserInfo(userId), getFieldStarCount(), userGetStarCount)
        .hincrby(getUserInfo(userId), getFieldBalloonCount(), userGetBalloonCount)
        .hincrby(getUserInfo(userId), getFieldCoinCount(), userGetCoinCount);
    for (var i = 0; i < GAME_BOARD; i++)
        multi.hmset(getUserGameInfo(competitorId, i), competitorGameInfo[i]);

    multi.exec(function (err) {
        if (err) {
            sendErrorMessage(res, ERROR_SERVER);
            consoleErrorMessage(ERROR_SERVER);
            return;
        }

        sendSucceedMessage(res, SUCCEED_REQUEST);
        consoleSucceedMessage(SUCCEED_REQUEST);
    });
});

/**
 *
 * 방어모드 셋팅
 * @userId
 * @competitorGameInfo
 *
 */

router.post('/settingDefenseMode', function (req, res) {
    consoleInputLog(req.body);

    var userId = req.body.userId;
    var userGameInfo = req.body.userGameInfo;

    if (!userId || !userGameInfo) {
        consoleErrorMessage(ERROR_WRONG_INPUT);
        sendErrorMessage(res, ERROR_WRONG_INPUT);
        return;
    }

    var multi = redisClient.multi();
    multi.select(0);
    for (var i = 0; i < GAME_BOARD; i++)
        multi.hmset(getUserGameInfo(userId, i), userGameInfo[i]);

    multi.exec(function (err) {
        if (err) {
            sendErrorMessage(res, ERROR_SERVER);
            consoleErrorMessage(ERROR_SERVER);
            return;
        }

        sendSucceedMessage(res, SUCCEED_REQUEST);
        consoleSucceedMessage(SUCCEED_REQUEST);
    });

});


module.exports = router;
