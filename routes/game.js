var express = require('express');
var redis = require('redis');
var moment = require('moment');
var _ = require('underscore');

var redisClient = redis.createClient(6379, '192.168.11.4');
var router = express.Router();
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

/**
 *
 * 로그인 세션 시간 상수화
 *
 */

const LOGIN_VALID_TIME = 60;
const GAME_TIME = 30;

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
        console.log({succeedCode: succeedCode, data: JSON.stringify(sendData)});
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

function SetUserLogining() {
    addMethod(this, "setUserLogining", function (res, userId, protocol) {
        var multi = redisClient.multi();
        multi.select(2)
            .sadd(userId, protocol)
            .expire(userId, LOGIN_VALID_TIME)

            .exec(function (err) {
                if (err) {
                    sendMessage.sendErrorMessage(res, ERROR_SERVER, err);
                    return;
                }
                sendMessage.sendSucceedMessage(res, SUCCEED_RESPONSE);
            });
    });

    addMethod(this, "setUserLoginingNoMatched", function (res, userId, protocol) {
        var multi = redisClient.multi();
        multi.select(2)
            .sadd(userId, protocol)
            .expire(userId, LOGIN_VALID_TIME)
            .exec(function (err) {
                if (err) {
                    sendMessage.sendErrorMessage(res, ERROR_SERVER, err);
                    return;
                }
                sendMessage.sendErrorMessage(res, ERROR_NO_MATCH);
            });
    });

    addMethod(this, "setUserLoginingMatched", function (res, userId, competitorId, matchedInfo, competitorGameInfo) {
        var multi = redisClient.multi();
        multi.select(2)
            .sadd(userId, 'gameStart')
            .expire(userId, LOGIN_VALID_TIME)
            .sadd(competitorId, 'gaming')
            .expire(competitorId, GAME_TIME)
            .select(0)
            .exec(function (err) {
                if (err) {
                    sendMessage.sendErrorMessage(res, ERROR_SERVER, err);
                    return;
                }

                redisClient.get(getUserMatchedList(userId), function (err, info) {
                    info.matchedInfo = matchedInfo;

                    redisClient.set(getUserMatchedList(userId), info, function (err) {
                        if (err) {
                            sendMessage.sendErrorMessage(res, ERROR_SERVER, err);
                            return;
                        }

                        sendMessage.sendSucceedMessage(res, SUCCEED_RESPONSE, competitorGameInfo);
                    });
                });
            });
    });
}

var setUserLogining = new SetUserLogining();

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
function getFandomUserNumber() {
    return 'fandomUserNumber';
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

function getFieldLevel() {
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

function getFieldCompetitorInfo() {
    return 'competitorInfo';
}
function getFieldCompetitorGameInfos() {
    return 'competitorGameInfos';
}

function getFieldCompetitorGameCountInfo() {
    return 'competitorGameCountInfo';
}

function getFieldBase() {
    return 'base';
}
function getFieldFull() {
    return 'full';
}
function getFieldDelay() {
    return 'delay';
}

function getUserMatchedList(userId) {
    return 'user:' + userId + ":matched";
}

/**
 *
 * 게임에 필요한 기본 정보 db 초기화
 *
 */

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
 * 레벨 부여 비율 db 초기화 함수
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
        .hget(getUserInfo(id), getFieldLevel())
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
 * 상대 유저 뽑기 함수
 *
 */

var searchCompetitorId = function (fandomExistingUserList, count, callback) {

    var randomIndex = makeRandom(0, fandomExistingUserList.length);
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
            multi.select(2)
                .exists(competitorId)
                .exec(function (err, reply) {
                    ++count;
                    var isLogining = reply[1];

                    if (count == 5) {
                        competitorId = null;
                        callback(competitorId);
                    }
                    else if (isLogining)
                        searchCompetitorId(fandomExistingUserList, count, callback);
                    else if (!isLogining)
                        callback(competitorId);

                });
        });
};

/**
 *
 * 상대 유저 게임정보 받아오기 함수
 *
 */

var getCompetitorUserInfo = function (competitorId, callback) {
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

            multi.hget(getHasStarByLevel(), competitorInfo['level']);

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

                callback(result);

            });
        });
};

/**
 *
 * 게임 시작 요청 (랜덤 매칭)
 * @userId
 * @fandomName
 *
 */

router.post('/gameStart', function (req, res) {
    consoleInputLog(req.body);
    var userFandomName = req.body.fandomName;
    var userId = req.body.userId;

    if (!userFandomName) {
        sendMessage.sendErrorMessage(res, ERROR_WRONG_INPUT);
        return;
    }

    var multi = redisClient.multi();
    multi.select(0)
        .zrange(getFandomUserNumber(), 0, -1, 'withscores')
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
                setUserLogining.setUserLoginingNoMatched(res, userId, 'gameStart');
                return;
            } else {
                searchCompetitorId(fandomExistingUserList, 0, function (competitorId) {
                    if (competitorId == null) {
                        setUserLogining.setUserLoginingNoMatched(res, userId, 'gameStart');
                        return;
                    }

                    getCompetitorUserInfo(competitorId, function (result) {
                        const time = moment(Date.now()).format('YYYY-MM-DD HH:mm');
                        const matchedInfo = {
                            competitorInfo: result.competitorInfo,
                            time: time
                        };
                        setUserLogining.setUserLoginingMatched(res, userId, competitorId, matchedInfo, result);
                    });
                });
            }
        });
});

/**
 *
 * 게임 끝난 후 요청
 *
 * @userId
 * @userFandomName
 * @userGetStarCount
 * @userCoinCount
 * @userGetBalloonCount
 * @competitorId
 * @competitorGameInfo
 *
 */

router.post('/gameOver', function (req, res) {

    consoleInputLog(req.body);
    var userId = req.body.userId;
    var userFandomName = req.body.userFandomName;
    var userGetStarCount = req.body.userGetStarCount;
    var userCoinCount = req.body.userCoinCount;
    var userGetBalloonCount = req.body.userGetBalloonCount;
    var competitorId = req.body.competitorId;
    var competitorGameInfo = req.body.competitorGameInfo;

    if (!userId || !userGetStarCount || !userCoinCount
        || !userGetBalloonCount || !competitorId || !competitorGameInfo || !userFandomName) {
        sendMessage.sendErrorMessage(res, ERROR_WRONG_INPUT);
        return;
    }

    var multi = redisClient.multi();
    multi.select(0)
        .hincrby(getUserInfo(userId), getFieldStarCount(), userGetStarCount)
        .zincrby(getFandomRank(), userGetStarCount, userFandomName)
        .hincrby(getUserInfo(userId), getFieldBalloonCount(), userGetBalloonCount)
        .hset(getUserInfo(userId), getFieldCoinCount(), userCoinCount)
        .exec(function (err) {
            if (err) {
                sendMessage.sendErrorMessage(res, ERROR_SERVER, err);
                return;
            }
            var splitedGameInfo = competitorGameInfo.split(",");

            var multi = redisClient.multi();
            multi.select(1);
            for (var i = 0; i < GAME_BOARD; i++)
                multi.hmset(getUserGameInfo(competitorId, i), getFieldGameBalloon(), splitedGameInfo[i * 2], getFieldStarType(), splitedGameInfo[i * 2 + 1]);

            multi.exec(function (err) {
                if (err) {
                    sendMessage.sendErrorMessage(res, ERROR_SERVER, err);
                    return;
                }

                setUserLogining.setUserLogining(res, userId, 'gameOver');
            });
        });
});

/**
 *
 * 방어모드 셋팅
 * @id
 * @userGameInfo
 *
 */

router.post('/settingDefenseMode', function (req, res) {
    consoleInputLog(req.body);

    var id = req.body.id;
    var userGameInfo = req.body.userGameInfo;

    if (!id || !userGameInfo) {
        sendMessage.sendErrorMessage(res, ERROR_WRONG_INPUT);
        return;
    }

    var splitedGameInfo = userGameInfo.split(",");

    var multi = redisClient.multi();
    multi.select(1);
    for (var i = 0; i < GAME_BOARD; i++)
        multi.hmset(getUserGameInfo(id, i), 'gameBalloon', splitedGameInfo[i * 2], 'starType', splitedGameInfo[i * 2 + 1]);

    multi.exec(function (err) {
        if (err) {
            sendMessage.sendErrorMessage(res, ERROR_SERVER, err);
            return;
        }

        setUserLogining.setUserLogining(res, id, 'settingDefenseMode');
    });
});


router.get('/userMatchedList', function (req, res) {
    const id = req.body.id;
    redisClient.select(0);

    redisClient.get(getUserMatchedList(id), function (err, matchedInfo) {
        if (err) {
            sendMessage.sendErrorMessage(res, ERROR_SERVER, err);
            return;
        }

        if (_.isEmpty(matchedInfo)) {
            matchedInfo = [];
        }
        sendMessage.sendSucceedMessage(res, SUCCEED_RESPONSE, {matchedInfo: matchedInfo});
    });
});

module.exports = router;