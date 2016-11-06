var express = require('express');
var redis = require('redis');
var moment = require('moment');
var _ = require('underscore');
const __ = require('lodash');
var GoogleSpreadsheet = require("google-spreadsheet");

var redisClient = redis.createClient(6388, 'fc-redis');
var router = express.Router();

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

    addMethod(this, "setUserLoginingMatched", function (res, userId, competitorId, competitorGameInfo, userInfo) {
        const matchedInfo = {};
        matchedInfo.id = userInfo.id;
        matchedInfo.time = userInfo.time;

        const multi = redisClient.multi();
        multi.select(2)
            .sadd(userId, 'gameStart')
            .expire(userId, LOGIN_VALID_TIME)
            .sadd(competitorId, 'gaming')
            .expire(competitorId, GAME_TIME)
            .select(1)
            .lpush(getUserMatchedList(competitorId), JSON.stringify(matchedInfo))
            .select(0)
            .exec(function (err) {
                if (err) {
                    sendMessage.sendErrorMessage(res, ERROR_SERVER, err);
                    return;
                }
                sendMessage.sendSucceedMessage(res, SUCCEED_RESPONSE, competitorGameInfo);
            });
    });

    addMethod(this, "setUserRevenge", function (res, userId, competitorId, competitorGameInfo, userInfo) {
        const matchedInfo = {};
        matchedInfo.id = userInfo.id;
        matchedInfo.time = userInfo.time;

        const multi = redisClient.multi();
        multi.select(2)
            .sadd(userId, 'gameStart')
            .expire(userId, LOGIN_VALID_TIME)
            .sadd(competitorId, 'gaming')
            .expire(competitorId, GAME_TIME)
            .select(1)
            .lpush(getUserMatchedList(competitorId), JSON.stringify(matchedInfo))
            .select(0)
            .exec(function (err) {
                if (err) {
                    sendMessage.sendErrorMessage(res, ERROR_SERVER, err);
                    return;
                }
                sendMessage.sendSucceedMessage(res, SUCCEED_RESPONSE, competitorGameInfo);
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

function getGameLevelRatio() {
    return 'gameLevelRatio';
}

function getUserRank(fandomName) {
    return 'userRank:' + fandomName;
}

function getUserInfo(userId) {
    return 'user:' + userId + ':info';
}

function getHasStarByLevel() {
    return 'hasStarByLevel';
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


function getUserMatchedList(userId) {
    return 'user:' + userId + ":matched";
}


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
    const multi = redisClient.multi();
    multi.select(0)
        .hgetall(getUserInfo(competitorId))
        .exec(function (err, reply) {
            if (err) {
                sendMessage.sendErrorMessage(res, ERROR_SERVER, err);
                return;
            }

            const competitorInfo = reply[1];
            var multi = redisClient.multi();
            multi.select(1);

            for (var i = 0; i < GAME_BOARD; i++)
                multi.hgetall(getUserGameInfo(competitorId, i));

            for (var j = 0; j < GAME_BOARD; j++)
                multi.hget(getUserGameInfo(competitorId, j), getFieldGameBalloon());


            multi.hget(getHasStarByLevel(), competitorInfo.level)
                .select(0)
                .zrank(getUserRank(competitorInfo.fandomName), competitorId);
            multi.exec(function (err, replies) {
                if (err) {
                    sendMessage.sendErrorMessage(res, ERROR_SERVER, err);
                    return;
                }
                console.log(replies);
                var competitorGameInfos = [];
                var competitorTotalBalloon = 0;

                for (var i = 1; i < replies.length - 3; i++) {
                    if (i <= GAME_BOARD)
                        competitorGameInfos.push(replies[i]);
                    else
                        competitorTotalBalloon += parseInt(replies[i]);
                }

                var competitorHasStarNumber = parseInt(replies[replies.length - 3]);
                var competitorRank = parseInt(replies[replies.length - 1]) + 1;

                competitorInfo.competitorRank = competitorRank;

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
                        redisClient.select(0);
                        redisClient.hgetall(getUserInfo(userId), function (err, userInfo) {
                            if (err) {
                                sendMessage.sendErrorMessage(res, ERROR_SERVER, err);
                                return;
                            }

                            const time = moment().format('YYYY.MM.DD HH:mm');
                            userInfo.time = time;

                            setUserLogining.setUserLoginingMatched(res, userId, competitorId, result, userInfo);
                        });
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
        .zincrby(getUserRank(userFandomName), userGetStarCount, userId)
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
                multi.hmset(getUserGameInfo(competitorId, i), getFieldGameBalloon(), splitedGameInfo[i * 3]
                    , getFieldStarType(), splitedGameInfo[i * 3 + 1], 'pin', splitedGameInfo[i * 3 + 2]
                );

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
        multi.hmset(getUserGameInfo(id, i), 'gameBalloon', splitedGameInfo[i * 3], 'starType', splitedGameInfo[i * 3 + 1], 'pin', splitedGameInfo[i * 3 + 2]);

    multi.exec(function (err) {
        if (err) {
            sendMessage.sendErrorMessage(res, ERROR_SERVER, err);
            return;
        }

        setUserLogining.setUserLogining(res, id, 'settingDefenseMode');
    });
});


/**
 * 유저의 게임매칭 리스트 받아오기
 *
 *  @ id
 */
router.post('/userMatchedList', function (req, res) {
    const id = req.body.id;

    if (_.isEmpty(id)) {
        sendMessage.sendErrorMessage(res, ERROR_WRONG_INPUT);
        return;
    }

    redisClient.select(1);
    redisClient.lrange(getUserMatchedList(id), 0, -1, function (err, matchedInfo) {
        if (err) {
            sendMessage.sendErrorMessage(res, ERROR_SERVER, err);
            return;
        }

        if (_.isEmpty(matchedInfo)) {
            matchedInfo = [];
            sendMessage.sendSucceedMessage(res, SUCCEED_RESPONSE, {matchedInfo: matchedInfo});
            return;
        }

        const multi = redisClient.multi();
        multi.select(0);

        matchedInfo.forEach(function (info) {
            const matchedInfo = JSON.parse(info)
            multi.hgetall(getUserInfo(matchedInfo.id));
        });

        multi.exec(function (err, matchedUserInfos) {
            if (_.isEmpty(matchedUserInfos)) {
                matchedInfo = [];
                sendMessage.sendSucceedMessage(res, SUCCEED_RESPONSE, {matchedInfo: matchedInfo});
                return;
            }

            const histories = [];

            matchedUserInfos.forEach(function (info, index) {
                if (index == 0)
                    return;

                _.extend(info, JSON.parse(matchedInfo[index - 1]));
                histories.push(info);
            });

            const userCount = __.countBy(histories, function (info) {
                return info.id;
            });

            const result = __.chain(histories)
                .uniqBy(info => info.id)
                .map(info => {
                    info.count = userCount[info.id];
                    return info;
                }).value();


            const multi = redisClient.multi();
            multi.select(2);

            _.each(result, function (info) {
                multi.exists(info.id);
            });

            multi.exec(function (err, isExists) {
                if (err) {
                    sendMessage.sendErrorMessage(res, ERROR_SERVER, err);
                    return;
                }

                isExists.forEach(function (exist, index) {
                    if (index == 0)
                        return;

                    if (exist)
                        result[index - 1].canGame = false;

                    else {
                        result[index - 1].canGame = true;
                    }
                });
                sendMessage.sendSucceedMessage(res, SUCCEED_RESPONSE, {matchedInfo: result});
            });
        });
    });
});


/**
 * 복수 매칭
 * @id
 * @revengedId
 */
router.post('/gameMatch', function (req, res) {
    const id = req.body.id;
    const revengedId = req.body.revengedId;

    redisClient.select(2);
    redisClient.exists(revengedId, function (err, isExist) {
        if (err) {
            sendMessage.sendErrorMessage(res, ERROR_SERVER, err);
            return;
        }

        if (isExist) {
            sendMessage.sendErrorMessage(res, ERROR_NO_MATCH, err);
            return;
        }

        getCompetitorUserInfo(revengedId, function (result) {
            if (_.isEmpty(result)) {
                sendMessage.sendErrorMessage(res, ERROR_SERVER, err);
                return;
            }

            redisClient.select(0);
            redisClient.hgetall(getUserInfo(id), function (err, userInfo) {
                if (err) {
                    sendMessage.sendErrorMessage(res, ERROR_SERVER, err);
                    return;
                }

                const time = moment().format('YYYY.MM.DD HH:mm');
                userInfo.time = time;

                setUserLogining.setUserRevenge(res, id, revengedId, result, userInfo);
            });
        });
    });
});

module.exports = router;
