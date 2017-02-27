var express = require('express');
var redis = require('redis');
var moment = require('moment');
var _ = require('underscore');
const __ = require('lodash');
var GoogleSpreadsheet = require("google-spreadsheet");

var redisClient = redis.createClient(6379, 'fc-redis');
// var redisClient = redis.createClient(6379, '127.0.0.1');

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

        sendMessage.sendSucceedMessage(res, SUCCEED_RESPONSE, 'if settingDefenseMode, ok and else GameOver, usr: login competitorId: logout ');

    });


    addMethod(this, "setUserLoginingNoMatched", function (res, userId, protocol) {

        sendMessage.sendErrorMessage(res, ERROR_NO_MATCH);

    });


    addMethod(this, "setUserLoginingMatched", function (res, userId, competitorId, competitorGameInfo, userInfo) {


        const matchedInfo = {};
        var multi;
        var info;
        const statusInfo = [];

        matchedInfo.id = userInfo.id;
        matchedInfo.time = userInfo.time;
        multi = redisClient.multi();

        statusInfo.push("playing");
        statusInfo.push(current_time());
        info = JSON.stringify(statusInfo);


        multi.select(3)
            .set(userStatus(userId), info)
            .set(userStatus(competitorId), info)
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
        var multi;
        const statusInfo = [];
        var info;

        matchedInfo.id = userInfo.id;
        matchedInfo.time = userInfo.time;
        multi = redisClient.multi();

        statusInfo.push("playing");
        statusInfo.push(current_time());
        info = JSON.stringify(statusInfo);

        multi.select(3)
            .set(userStatus(userId),info)
            .set(userStatus(competitorId),info)
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


    addMethod(this, "checkGhost", function (res, id, matchedInfo) {


        var multi = redisClient.multi();


        multi.select(1)
            .lrem(getUserMatchedList(id),0,matchedInfo)
            .exec(function (err, reply) {


                if(err){
                    sendMessage.sendErrorMessage(res, ERROR_SERVER, err);
                    return;
                }

                var count = reply;
                return;

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




///////////////////////////////// GILVERT //////////////////////////////////


//------------------------* 공통 *------------------------//


const DELAY_MATCHING_TIME = 300 * 1000; // 5분
const VAILD_DELAY_LOGOUT = 60;



function  current_time() {
    var time;
    time = moment().format('YYYY.MM.DD HH:mm');
    return time;
}

function userStatus(userid) {
    return 'status:'+ userid;
}


//-------------------* UPDATE_170222 *-------------------//






//-------------------* UPDATE_170220 *-------------------//


/*

 1. userMatchedList
 - @id
 - 사용자와 경기를 치룬 상대방의 정보를 리스트로 가져옴

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



        /*------------------------------추가되는 부분1-------------------------------------------*/



        function temp_fun(id) {
            return 'user:'+id+':info';
        }

        var count = 0;
        var temp_matchedInfo;
        var temp_matchedInfos = [];
        const multi = redisClient.multi();


        multi.select(0);


        _.each(matchedInfo, function (id) {

            temp_matchedInfo = JSON.parse(id);
            multi.exists(temp_fun(temp_matchedInfo.id));

        });


        multi.exec(function (err, isExists) {


            if (err) {
                sendMessage.sendErrorMessage(res, ERROR_SERVER, err);
                return;
            }


            isExists.forEach(function (exist, index) {


                if(index == 0){
                    return;
                }


                if (exist == 0){

                    var temp_info = matchedInfo[count];
                    temp_matchedInfos.push(temp_info);
                    ++count;
                    return;

                }

                ++count;
                return;

            });


            multi.select(1);

            _.each(temp_matchedInfos, function (info) {

                var infos = JSON.parse(info);
                var string_infos = JSON.stringify(infos);
                multi.lrem(getUserMatchedList(id),0,string_infos);

            });



            multi.exec(function (err, reply) {

                if (err) {
                    sendMessage.sendErrorMessage(res, ERROR_SERVER, err);
                    return;
                }


                ///////////////////////[시작]여기에 기존에 있는 값을 넣어보자////////////////////////////////


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


                        if(info == null){
                            return;
                        }

                        if (index == 0)
                            return;

                        _.extend(info, JSON.parse(matchedInfo[index - 1]));
                        histories.push(info);


                    });

                    //중복된 아이디 카운트
                    const userCount = __.countBy(histories, function (info) {
                        return info.id;
                    });



                    //사용자 전체 정보 중에서 count  정보를 추가로 넣는다
                    const result = __.chain(histories)
                            .uniqBy(info => info.id)
                    .map(info => {
                        info.count = userCount[info.id];
                    return info;
                }).value();



                    //사용자가 공격 가능한 상태인지 파악하는 부분
                    multi.select(3);

                    var temp_id;

                    _.each(result, function (info) {
                        temp_id = info.id;
                        multi.exists(userStatus(temp_id));
                    });


                    multi.exec(function (err, isExists) {

                        var flag;
                        flag = isExists;


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

                            // consoleInputLog("result[index - 1].canGame: "+result[index - 1].canGame);


                        });
                        sendMessage.sendSucceedMessage(res, SUCCEED_RESPONSE, {matchedInfo: result});
                    });



                });



                ///////////////////////여기에 기존에 있는 값을 넣어보자////////////////////////////////

            });

        });

        /*------------------------------추가되는 부분2-------------------------------------------*/

    });

});




//-------------------* UPDATE_170213 *-------------------//

/*

 1. startLogin
 - @id
 - 로그인 전에 사용자의 상태 파악
 - 상대방과의 대전 시간을 통해 상태 정의

 */


router.post('/startLogin', function (req, res) {


    var id;
    var status_login;
    var multi;


    id = req.body.id;
    status_login  = "login";
    multi = redisClient.multi();


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

            redisClient.select(3);
            var statusInfo = [];
            statusInfo.push("login");
            statusInfo.push(current_time());
            var info = JSON.stringify(statusInfo);
            redisClient.set(userStatus(id),info);

            sendMessage.sendSucceedMessage(res, SUCCEED_RESPONSE, "yes");

            return;
        }


        var temp_time;
        var temp_id;
        var match_time=[];
        var match_id = [];
        var i=0;

        matchedInfo.forEach(function (info) {

            const matchedInfo = JSON.parse(info)
            temp_time = matchedInfo.time;
            match_time[i] = temp_time;

            temp_id = matchedInfo.id;
            match_id[i] = temp_id;

            ++i;

        });


        const enemy_id = String(match_id[0]);

        multi.select(3)
            .get(userStatus(enemy_id))
            .exec(function (err, reply) {
                if(err){
                    sendMessage.sendErrorMessage(res, ERROR_SERVER, err);
                    return;
                }


                var temp = [];
                var status;
                temp = JSON.parse(reply[1]);


                if(temp ==null){
                    status = 'logout';
                }else{
                    status = temp[0];
                }


                const enemy_time = match_time[0];
                const user_time = moment().format('YYYY.MM.DD HH:mm');
                var old = new Date (enemy_time);
                var now = new Date(user_time);

                var old_time = old.getTime();
                var now_time = now.getTime();
                var matching_time = DELAY_MATCHING_TIME;


                if(now_time-old_time < matching_time && status =="playing"){

                    sendMessage.sendSucceedMessage(res, SUCCEED_RESPONSE, "no");

                }else {

                    redisClient.select(3);
                    const statusInfo = [];
                    statusInfo.push("login");
                    statusInfo.push(current_time());
                    const info = JSON.stringify(statusInfo);
                    redisClient.set(userStatus(id),info);

                    sendMessage.sendSucceedMessage(res, SUCCEED_RESPONSE, "yes");

                }


            });

    });
});





//-------------------* UPDATE_170124 *-------------------//


/*

 1. btnResumeToGame
 - @id, @competitorId
 - 대전 > 정지 : 다시 대전으로 돌아오는 경우
 */



router.post('/btnResumeToGame', function (req,res) {


    var id;
    var competitorId;
    var multi;
    const statusInfo = [];
    var info;


    id = req.body.id;
    competitorId = req.body.competitorId;
    multi = redisClient.multi();

    statusInfo.push("playing");
    statusInfo.push(current_time());
    info = JSON.stringify(statusInfo);


    multi.select(3)
        .set(userStatus(id),info)
        .set(userStatus(competitorId), info)
        .exec(function (err) {
            if (err) {
                sendMessage.sendErrorMessage(res, ERROR_SERVER, err);
                return;
            }
            sendMessage.sendSucceedMessage(res, 'user: playing, competitor: playing');
        });
});



//-------------------* UPDATE_170120 *-------------------//


/*

 1. pauseOnGame
 - @id, @competitorId
 - 게임 중 정지
 2. resumeOnGame
 - @userId, @competitorId
 3. btnExitOnGame
 - @id, @competitorId
 4. exitOnGame
 - @id, @competitorId


 */



router.post('/pauseOnGame', function (req,res) {


    var userId;
    var competitorId;
    var time;
    var multi;

    userId = req.body.id;
    competitorId = req.body.competitorId;
    multi = redisClient.multi();
    time = VAILD_DELAY_LOGOUT;


    multi.select(3)
        .expire(userStatus(userId),time)
        .expire(userStatus(competitorId),time)
        .exec(function (err) {

            if (err) {
                sendMessage.sendErrorMessage(res, ERROR_DATABASE, err);
                return;
            }
            sendMessage.sendSucceedMessage(res, 'user: logout(expire 60), competitor: logout(expire 60)');
        });
});


router.post('/resumeOnGame', function (req,res) {


    var userId;
    var competitorId;
    var multi;

    userId = req.body.id;
    competitorId = req.body.competitorId;
    multi = redisClient.multi();

    const statusInfo = [];
    statusInfo.push("playing");
    statusInfo.push(current_time());
    var info = JSON.stringify(statusInfo);

    multi.select(3)
        .set(userStatus(userId),info)
        .set(userStatus(competitorId),info)
        .expire(userStatus(userId), LOGIN_VALID_TIME*0.5)
        .expire(userStatus(competitorId), LOGIN_VALID_TIME*0.5)
        .exec(function (err) {
            if (err) {
                sendMessage.sendErrorMessage(res, ERROR_DATABASE, err);
                return;
            }
            sendMessage.sendSucceedMessage(res, 'user: playing(expire 30), competitor: playing(expire 30)');
        });
});


router.post('/btnExitOnGame', function (req,res) {


    var userId;
    var competitorId;
    var multi;
    const statusInfo = [];
    var info;

    userId = req.body.id;
    competitorId = req.body.competitorId;
    multi = redisClient.multi();

    statusInfo.push("login");
    statusInfo.push(current_time());
    info = JSON.stringify(statusInfo);


    multi.select(3)
        .set(userStatus(userId),info)
        .del(userStatus(competitorId))
        .exec(function (err) {
            if (err) {
                sendMessage.sendErrorMessage(res, ERROR_DATABASE, err);
                return;
            }
            sendMessage.sendSucceedMessage(res, 'user: login, competitorId: logout');
        });
});


router.post('/exitOnGame', function (req,res) {


    var id;
    var competitorId;
    var multi;

    id = req.body.id;
    competitorId = req.body.competitorId;
    multi = redisClient.multi();

    multi.select(3)
        .del(userStatus(id))
        .del(userStatus(competitorId))
        .exec(function (err) {

            if (err) {
                sendMessage.sendErrorMessage(res, ERROR_DATABASE, err);
                return;
            }
            sendMessage.sendSucceedMessage(res, 'user:logout, competitor: logout');
        });
});







//-------------------* 윤태린 세션 *-------------------//


/*

 1. initLevelRatio
 - 레벨 부여 비율 db 초기화 함수
 2. initHasStarByLevel
 - 레벨별 별 소유 개수 db 초기화 함수
 3. gameStart
 - @userId, @fandomName
 - 게임 시작 요청 (랜덤 매칭)
 4. [함수] searchCompetitorId
 - 상대 유저 뽑기 함수



 5. [함수] getCompetitorUserInfo
 - 상대 유저 게임정보 받아오기 함수
 6. gameOver
 - @userId, @userFandomName, @userGetStarCount, @userCoinCount, @userGetBalloonCount, @competitorId. @competitorGameInfo
 - 게임 끝난 후 요청
 7. settingDefenseMode
 - @id, @userGameInfo
 - 방어모드 셋팅
 8. gameMatch
 - @id
 - [방어기록] 유저의 게임매칭 리스트 받아오기


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


router.post('/gameStart', function (req, res) {

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

            multi.select(3)
                .exists(userStatus(competitorId))
                .exec(function (err, reply) {

                    ++count;
                    var isLogining = reply[1]; // 0: 로그아웃 1: 로그인 플레이

                    if (count == 5) {
                        competitorId = null;
                        callback(competitorId);
                    }

                    else if (isLogining)
                        searchCompetitorId(fandomExistingUserList, count, callback);

                    else if (!isLogining)
                        callback(competitorId);


                    const time = moment().format('YYYY.MM.DD HH:mm');
                    var status = "[\"playing\",\""+time+"\"]";
                    var multi_sec = redisClient.multi();


                    multi_sec.select(3)
                        .set(userStatus(competitorId),status)
                        .exec(function (err,reply) {
                            if(err){
                                sendMessage.sendErrorMessage(res, ERROR_SERVER, err);
                                return;
                            }

                            return;
                        })

                });
        });
};





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
                .zrank(getUserRank(competitorInfo.fandomName), competitorId)
                .exec(function (err, replies) {
                    if (err) {
                        sendMessage.sendErrorMessage(res, ERROR_SERVER, err);
                        return;
                    }

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


router.post('/gameOver', function (req, res) {


    var userId = req.body.userId;
    var userFandomName = req.body.userFandomName;
    var userGetStarCount = req.body.userGetStarCount;
    var userCoinCount = req.body.userCoinCount;
    var userGetBalloonCount = req.body.userGetBalloonCount;

    var competitorId = req.body.competitorId;
    var competitorGameInfo = req.body.competitorGameInfo;
    var multi = redisClient.multi();
    const statusInfo = [];
    var info;


    if (!userId || !userGetStarCount || !userCoinCount
        || !userGetBalloonCount || !competitorId || !competitorGameInfo || !userFandomName) {
        sendMessage.sendErrorMessage(res, ERROR_WRONG_INPUT);
        return;
    }


    statusInfo.push("login");
    statusInfo.push(current_time());
    info = JSON.stringify(statusInfo);


    multi.select(0)

        .hincrby(getUserInfo(userId), getFieldStarCount(), userGetStarCount)
        .zincrby(getFandomRank(), userGetStarCount, userFandomName)
        .zincrby(getUserRank(userFandomName), userGetStarCount, userId)
        .hincrby(getUserInfo(userId), getFieldBalloonCount(), userGetBalloonCount)
        .hset(getUserInfo(userId), getFieldCoinCount(), userCoinCount)

        .select(3)
        .set(userStatus(userId),info )
        .del(userStatus(competitorId))
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

                setUserLogining.setUserLogining(res, userId, 'gameover');
            });
        });
});


router.post('/settingDefenseMode', function (req, res) {


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


router.post('/gameMatch', function (req, res) {

    const id = req.body.id;
    const revengedId = req.body.revengedId;

    redisClient.select(3);
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