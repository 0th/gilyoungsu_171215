var express = require('express');
var redis = require('redis');
var redisClient = redis.createClient();
var router = express.Router();
var _ = require('underscore');
var GoogleSpreadsheet = require("google-spreadsheet");
var balloonBlowSpeedSheet = new GoogleSpreadsheet('1GDBrKUfyqo4LAK0BuSyjJ6FETMj3yljxUVyHYCLnPxk');
var gameLevelRatioSheet = new GoogleSpreadsheet('1KcXl1hRoJ-xL4yqOo1ahf8WjG-dVfspZTPp1Akt15Yc');
var hasStarByLevelSheet = new GoogleSpreadsheet('1k-xgKpJYQkgZH8nrSS8qx0KZ3BoSDvo-ys6LWV6hV1c');

const ERROR_SHEET = 101;
const ERROR_SERVER = 202;
const ERROR_WRONG_INPUT = 505;
const ERROR_NO_MATCH = 405;
const SUCCEED_RESPONSE = 704;
const SUCCEED_INIT_DB = 701;
const GAME_BOARD = 36;

var message = {};
message[ERROR_SHEET] = "구글 스프레드시트 오류";
message[ERROR_SERVER] = "서버연결 실패";
message[ERROR_WRONG_INPUT] = "입력값 오류";
message[ERROR_NO_MATCH] = "게임 매칭 실패";

function addMethod(object, functionName, func) {
    var overloadingFunction = object[functionName];
    object[functionName] = function () {
        if (func.length == arguments.length)
            return func.apply(this, arguments);
        else if (typeof overloadingFunction == 'function')
            return overloadingFunction.apply(this, arguments);
    };
}

function SendMessage() {
    addMethod(this, "sendSucceedMessage", function (res, succeedCode) {
        res.send({succeedCode: succeedCode});
        console.log({succeedCode: succeedCode});
    });

    addMethod(this, "sendSucceedMessage", function (res, succeedCode, sendData) {
        res.send({succeedCode: succeedCode, data: sendData});
        console.log({succeedCode: succeedCode, data: sendData})
    });

    addMethod(this, "sendErrorMessage", function (res, errorCode, err) {
        res.send({errorCode: errorCode, errorMessage: message[errorCode]});
        console.log({errorCode: errorCode, errorMessage: message[errorCode], error: err});
    });

    addMethod(this, "sendErrorMessage", function (res, errorCode) {
        res.send({errorCode: errorCode, errorMessage: message[errorCode]});
        console.log({errorCode: errorCode, errorMessage: message[errorCode]});
    });
}

var sendMessage = new SendMessage();

function consoleInputLog(body) {
    console.log(body);
}

function makeRandom(min, max) {
    var randomNumber = Math.random() * (max - min) + min;
    return Math.floor(randomNumber);
}

function getFandomRank() {
    return 'fandomRank';
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

function getFieldStarType() {
    return 'starType';
}

function getCanGameFandom() {
    return 'canGameFandom';
}
function getCanGameUser(fandomName) {
    return 'canGameUser:' + fandomName;

}
function getFieldFandomName() {
    return 'fandomName';
}
function getFieldCANT_GAME() {
    return 'CANT_GAME';
}
function getFieldUserNumber() {
    return 'userNumber';
}

function getUserGameInfo(userId, i) {
    return 'userGameInfo:' + userId + ':' + i;
}

function getFieldGameBalloon() {
    return 'gameBalloon';
}

function getFieldUserLevel() {
    return 'level';
}
function getFieldCompetitorInfo() {
    return 'competitorInfo';
}
function getFieldCompetitorGameInfos() {
    return 'competitorGameInfos';
}

function getFieldCompetitorGameCountInfo() {
    return 'competitorGameCountInfo';
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
            sendMessage.sendErrorMessage(res, ERROR_SHEET, err);
            return;
        }

        var rowKeys = Object.keys(rowData);

        rowKeys.forEach(function (key) {
            var keys = Object.keys(rowData[key]);

            var multi = redisClient.multi();
            multi.select(1)
                .hmset(getGameBlowSpeed(), getFieldBase(), rowData[key][keys[3]]
                    , getFieldFull(), rowData[key][keys[4]], getFieldDelay(), rowData[key][keys[5]])
                .exec(function (err) {
                    if (err) {
                        sendMessage.sendErrorMessage(res, ERROR_SERVER, err);
                        return;
                    }
                });
        });
        sendMessage.sendSucceedMessage(res, SUCCEED_INIT_DB);
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
            sendMessage.sendErrorMessage(res, ERROR_SHEET, err);
            return;
        }

        var rowKeys = Object.keys(rowData);

        rowKeys.forEach(function (key) {
            var keys = Object.keys(rowData[key]);

            var multi = redisClient.multi();
            multi.select(1)
                .hset(getGameLevelRatio(), rowData[key][keys[3]], rowData[key][keys[4]])
                .exec(function (err) {
                    if (err) {
                        sendMessage.sendErrorMessage(res, ERROR_SERVER, err);
                        return;
                    }
                });
        });

        sendMessage.sendSucceedMessage(res, SUCCEED_INIT_DB);
    });
});

/**
 *
 * 레벨별 별 소유 개수 db 초기화 함수
 *
 */

router.get('/initHasStarByLevel', function (req, res) {

    hasStarByLevelSheet.getRows(1, function (err, rowData) {

        if (err) {
            sendMessage.sendErrorMessage(res, ERROR_SHEET, err);
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
                        sendMessage.sendErrorMessage(res, ERROR_SERVER, err);
                        return;
                    }
                });
        });
        sendMessage.sendSucceedMessage(res, SUCCEED_INIT_DB);
    });
});

//--------------------------------- 초기화  -----------------------------------//


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
        sendMessage.sendErrorMessage(res, ERROR_WRONG_INPUT);
        return;
    }

    var multi = redisClient.multi();
    multi.select(0)
        .hget(getUserInfo(id), getLevel())
        .exec(function (err, rep) {
            if (err) {
                sendMessage.sendErrorMessage(res, ERROR_SERVER, err);
                return;
            }

            var userLevel = rep[1];

            var multi = redisClient.multi();
            multi.select(1)
                .hget(getHasStarByLevel(), userLevel)
                .exec(function (err, reply) {

                    if (err) {
                        sendMessage.sendErrorMessage(res, ERROR_SERVER, err);
                        return;
                    }

                    var userHaveStarNumber = reply[1];

                    sendMessage.sendSucceedMessage(res, SUCCEED_RESPONSE, userHaveStarNumber);

                });
        });
});


/**
 *
 * 게임 시작 요청 (랜덤 매칭)
 * @fandomName
 *
 */

router.post('/gameStart', function (req, res) {

    consoleInputLog(req.body);
    var userFandomName = req.body.fandomName;

    if (!userFandomName) {
        sendMessage.sendErrorMessage(res, ERROR_WRONG_INPUT);
        return;
    }

    var multi = redisClient.multi();

    multi.select(0)
        .zrange(getCanGameFandom(), 0, -1, 'withscores')
        .exec(function (err, reply) {

            if (err) {
                sendMessage.sendErrorMessage(res, ERROR_SERVER, err);
                return;
            }
            var fandomUserNumbers = reply[1];
            var fandomExistingUserList = [];

            for (var i = 0; i < fandomUserNumbers.length; i = i + 2) {
                var fandomName = fandomUserNumbers[i];
                var userNumber = fandomUserNumbers[i + 1];
                if (userNumber != 0 && userFandomName != fandomName && fandomName != getFieldCANT_GAME()) {
                    var fandomInfo = {};
                    fandomInfo[getFieldFandomName()] = fandomName;
                    fandomInfo[getFieldUserNumber()] = userNumber;
                    fandomExistingUserList.push(fandomInfo);
                }
            }

            if (fandomExistingUserList.length == 0) {
                sendMessage.sendErrorMessage(res, ERROR_NO_MATCH, err);
                return;
            }

            var randomIndex = makeRandom(0, fandomExistingUserList.length - 1);
            var competitorFandomInfos = fandomExistingUserList[randomIndex];
            var competitorFandomName = competitorFandomInfos[getFieldFandomName()];

            var multi = redisClient.multi();
            multi.select(0)
                .srandmember(getCanGameUser(competitorFandomName))
                .exec(function (err, reply) {

                    if (err) {
                        sendMessage.sendErrorMessage(res, ERROR_SERVER, err);
                        return;
                    }

                    var competitorId = reply[1];
                    var multi = redisClient.multi();
                    multi.select(0)
                        .hgetall(getUserInfo(competitorId))
                        .exec(function (err, reply) {

                            if (err) {
                                sendMessage.sendErrorMessage(res, ERROR_SERVER, err);
                                return;
                            }

                            var competitorInfo = reply[1];
                            var multi = redisClient.multi();
                            multi.select(1);

                            for (var i = 0; i < GAME_BOARD; i++)
                                multi.hgetall(getUserGameInfo(competitorId, i));

                            for (var j = 0; j < GAME_BOARD; j++)
                                multi.hget(getUserGameInfo(competitorId, j), getFieldGameBalloon());

                            multi.hget(getHasStarByLevel(), competitorInfo[getFieldUserLevel()]);

                            multi.exec(function (err, replies) {

                                if (err) {
                                    sendMessage.sendErrorMessage(res, ERROR_SERVER, err);
                                    return;
                                }

                                var competitorGameInfos = [];
                                var competitorTotalBalloon = 0;

                                for (var i = 1; i < replies.length - 1; i++) {
                                    if (i <= GAME_BOARD)
                                        competitorGameInfos.push(replies[i]);
                                    else
                                        competitorTotalBalloon += parseInt(replies[i]);
                                }

                                var competitorHasStarNumber = parseInt(replies[replies.length - 1]);
                                var competitorGameCountInfo = {
                                    'totalBalloon': competitorTotalBalloon,
                                    'bigStar': parseInt(competitorHasStarNumber / 10),
                                    'smallStar': competitorHasStarNumber % 10
                                };

                                var result = {};
                                result[getFieldCompetitorInfo()] = competitorInfo;
                                result[getFieldCompetitorGameInfos()] = competitorGameInfos;
                                result[getFieldCompetitorGameCountInfo()] = competitorGameCountInfo;

                                var multi = redisClient.multi();
                                multi.select(0)
                                    .zincrby(getCanGameFandom(), -1, competitorFandomName)
                                    .zincrby(getCanGameFandom(), 1, getFieldCANT_GAME())
                                    .srem(getCanGameUser(competitorFandomName), competitorId)
                                    .sadd(getCanGameUser(getFieldCANT_GAME()), competitorId)
                                    .exec(function (err) {
                                        if (err) {
                                            sendMessage.sendErrorMessage(res, ERROR_SERVER, err);
                                            return;
                                        }

                                        sendMessage.sendSucceedMessage(res, SUCCEED_RESPONSE, result);

                                    });
                            });
                        });
                });
        });
});


/**
 *
 * 게임 끝난 후 요청
 *
 * @userId
 * @userFandomName
 * @userGetStarCount
 * @userGetCoinCount
 * @userGetBalloonCount
 * @competitorId
 * @competitorFandomName
 * @competitorGameInfo
 *
 */
function getLogining() {
    return 'logining';
}

router.post('/gameOver', function (req, res) {
    consoleInputLog(req.body);

    var userId = req.body.userID;
    var userFandomName = req.body.userFandomName;
    var userGetStarCount = req.body.userGetStarCount;
    var userGetCoinCount = req.body.userGetCoinCount;
    var userGetBalloonCount = req.body.userGetBalloonCount;
    var competitorId = req.body.competitorId;
    var competitorFandomName = req.body.competitorFandomName;
    var competitorGameInfo = req.body.competitorGameInfo;

    if (!userId || !userGetStarCount || !userGetCoinCount
        || !userGetBalloonCount || !competitorId || !competitorGameInfo || !userFandomName || !competitorFandomName) {
        sendMessage.sendErrorMessage(res, ERROR_WRONG_INPUT);
        return;
    }

    var multi = redisClient.multi();
    multi.select(0)
        .hincrby(getUserInfo(userId), getFieldStarCount(), userGetStarCount)
        .zincrby(getFandomRank(), userGetStarCount, userFandomName)
        .hincrby(getUserInfo(userId), getFieldBalloonCount(), userGetBalloonCount)
        .hincrby(getUserInfo(userId), getFieldCoinCount(), userGetCoinCount)
        .exec(function (err) {

            if (err) {
                sendMessage.sendErrorMessage(res, ERROR_SERVER, err);
                return;
            }
            var splitedGameInfo = competitorGameInfo.split(",");

            var multi = redisClient.multi();
            multi.select(1);
            for (var i = 0; i < splitedGameInfo.length; i++)
                multi.hmset(getUserGameInfo(competitorId, i), getFieldGameBalloon(), splitedGameInfo[i * 2], getFieldStarType(), splitedGameInfo[i * 2 + 1]);
            multi.exec(function (err) {
                if (err) {
                    sendMessage.sendErrorMessage(res, ERROR_SERVER, err);
                    return;
                }

                var multi = redisClient.multi();
                multi.select(0)
                    .sismember(getLogining(), competitorId)
                    .exec(function (err, reply) {

                        if (err) {
                            sendMessage.sendErrorMessage(res, ERROR_SERVER, err);
                            return;
                        }

                        var isLogining = reply[1];

                        if (isLogining == 0) {
                            var multi = redisClient.multi();
                            multi.select(0)
                                .zincrby(getCanGameFandom(), 1, competitorFandomName)
                                .zincrby(getCanGameFandom(), -1, getFieldCANT_GAME())
                                .srem(getCanGameUser(getFieldCANT_GAME()), competitorId)
                                .sadd(getCanGameUser(competitorFandomName), competitorId)
                                .exec(function (err) {
                                    if (err) {
                                        sendMessage.sendErrorMessage(res, ERROR_SERVER, err);
                                        return;
                                    }
                                });
                        }
                        sendMessage.sendErrorMessage(res, ERROR_SERVER, err);
                    });


                sendMessage.sendSucceedMessage(res, SUCCEED_RESPONSE);
            });
        });
});

/**
 *
 * 방어모드 셋팅
 * @userId
 * @userGameInfo
 *
 */

router.post('/settingDefenseMode', function (req, res) {
    consoleInputLog(req.body);

    var userId = req.body.userId;
    var userGameInfo = req.body.userGameInfo;

    if (!userId || !userGameInfo) {
        sendMessage.sendErrorMessage(res, ERROR_WRONG_INPUT);
        return;
    }

    var splitedGameInfo = userGameInfo.split(",");

    var multi = redisClient.multi();
    multi.select(1);
    for (var i = 0; i < splitedGameInfo.length; i++) {
        multi.hmset(getUserGameInfo(userId, i), getFieldGameBalloon(), splitedGameInfo[i * 2], getFieldStarType(), splitedGameInfo[i * 2 + 1]);
    }
    multi.exec(function (err) {
        if (err) {
            sendMessage.sendErrorMessage(res, ERROR_SERVER, err);
            return;
        }

        sendMessage.sendSucceedMessage(res, SUCCEED_RESPONSE);

    });
});


module.exports = router;
