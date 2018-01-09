const express = require('express');
const redis = require('redis');
const moment = require('moment');
const _ = require('underscore');
const __ = require('lodash');
const router = express.Router();
const GoogleSpreadsheet = require("google-spreadsheet");
const gameLevelRatioSheet = new GoogleSpreadsheet('1KcXl1hRoJ-xL4yqOo1ahf8WjG-dVfspZTPp1Akt15Yc');
const hasStarByLevelSheet = new GoogleSpreadsheet('1k-xgKpJYQkgZH8nrSS8qx0KZ3BoSDvo-ys6LWV6hV1c');


///////////////////////// AWS VS Local ///////////////////////////////////////

const redisClient = redis.createClient(6379, 'fc-redis');
// const redisClient = redis.createClient(6379, '127.0.0.1');

/////////////////////////////////////////////////////////////////////////////




const ERROR_SHEET = 101;
const ERROR_SERVER = 202;
const ERROR_WRONG_INPUT = 505;
const ERROR_NO_MATCH = 405;
const SUCCEED_RESPONSE = 704;
const SUCCEED_INIT_DB = 701;
const GAME_BOARD = 36;
const LOGIN_VALID_TIME = 60;
const TIME_WEEK = 60*60*24*7;
let message = {};

message[ERROR_SHEET] = "구글 스프레드시트 오류";
message[ERROR_SERVER] = "서버연결 실패";
message[ERROR_WRONG_INPUT] = "입력값 오류";
message[ERROR_NO_MATCH] = "게임 매칭 실패";






function addMethod(object, functionName, func) {
    const overloadingFunction = object[functionName];
    object[functionName] = function () {
        if (func.length == arguments.length)
            return func.apply(this, arguments);
        else if (typeof overloadingFunction == 'function')
            return overloadingFunction.apply(this, arguments);
    };
}




const sendMessage = new SendMessage();




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



function SetUserLogining() {


    addMethod(this, "setUserLogining", function (res, userId, protocol) {

        sendMessage.sendSucceedMessage(res, SUCCEED_RESPONSE, '[settingDefenseMode] ok , [GameOver] usr: login competitorId: logout ');

    });


    addMethod(this, "setUserLoginingNoMatched", function (res, userId, protocol) {

        sendMessage.sendErrorMessage(res, ERROR_NO_MATCH);

    });


    addMethod(this, "setUserLoginingMatched", function (res, userId, competitorId, competitorGameInfo, userInfo,fandomName) {


        const matchedInfo = {};
        let multi;
        let info;
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
            .expire(getUserMatchedList(competitorId),TIME_WEEK)
            .select(4)
            .hgetall(getSloganForFandom(fandomName))
            .exec(function (err, reply) {

                if (err) {
                    sendMessage.sendErrorMessage(res, ERROR_SERVER, err);
                    return;
                }


                let getReply = reply;
                consoleInputLog("getReply: "+getReply);


                let list = [];
                let sloganList = [];
                let getuser = "";
                let getslogan = "";
                let num= 0;
                let send_message = [];


                list  = getReply[7];
                consoleInputLog("list: "+list);



                if(list){

                    let key = _.keys(list);

                    _.each(key, function (index) {
                        const info = {};
                        info.user = index;
                        info.slogan = list[index];
                        sloganList.push(info);
                    });


                    let generateRandom = function (min, max) {
                        let ranNum = Math.floor(Math.random()*(max-min+1)) + min;
                        return ranNum;
                    }

                    num = generateRandom(0,sloganList.length-1);
                    getuser = sloganList[num].user;
                    getslogan = sloganList[num].slogan;

                    send_message =[getslogan,getuser];
                    // sendMessage.sendSucceedMessage(res, send_message);
                    // return;

                }else{

                    getuser = "팬덤컵";
                    getslogan = "팬심으로 대동단결";
                    send_message =[getslogan,getuser];
                    // sendMessage.sendSucceedMessage(res, send_message);
                    // return;

                }


                consoleInputLog("getuser: "+getuser);
                consoleInputLog("getslogan: "+getslogan);




                competitorGameInfo['user'] = getuser;
                competitorGameInfo['slogan'] = getslogan;
                consoleInputLog("competitorGameInfo: "+JSON.stringify(competitorGameInfo));

                sendMessage.sendSucceedMessage(res, SUCCEED_RESPONSE, competitorGameInfo);
            });


    });



    addMethod(this, "setUserRevenge", function (res, userId, competitorId, competitorGameInfo, userInfo) {

        const matchedInfo = {};
        let multi;
        const statusInfo = [];
        let info;

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
            .expire(getUserMatchedList(competitorId),TIME_WEEK)
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


        const multi = redisClient.multi();


        multi.select(1)
            .lrem(getUserMatchedList(id),0,matchedInfo)
            .exec(function (err) {


                if(err){
                    sendMessage.sendErrorMessage(res, ERROR_SERVER, err);
                    return;
                }

                return;

            });

    });


}




const setUserLogining = new SetUserLogining();



function consoleInputLog(body) {
    console.log(body);
}

function makeRandom(min, max) {
    const randomNumber = Math.random() * (max - min) + min;
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
    let time;
    time = moment().format('YYYY.MM.DD HH:mm');
    return time;
}

function userStatus(userid) {
    return 'status:'+ userid;
}

function recordBattle(id) {
    return 'battle:'+id;
}



function checkStatus(id) {
    return 'status:'+id;
}






//-------------------* UPDATE_180103 0th*-------------------//


function getSloganForFandom(fandomName) {
    return 'fan:slogan:' + fandomName;
}


router.post('/gameStart', function (req, res) {

    const userFandomName = req.body.fandomName;
    const userId = req.body.userId;



    if (!userFandomName) {
        sendMessage.sendErrorMessage(res, ERROR_WRONG_INPUT);
        return;
    }



    const multi = redisClient.multi();


    multi.select(0)
        .zrange(getFandomUserNumber(), 0, -1, 'withscores')
        .exec(function (err, reply) {

            if (err) {
                sendMessage.sendErrorMessage(res, ERROR_SERVER, err);
                return;
            }

            let fandomUserNumbers = reply[1];
            let fandomExistingUserList = [];

            for (let i = 0; i < fandomUserNumbers.length; i = i + 2) {
                let fandomName = fandomUserNumbers[i];
                let userNumber = fandomUserNumbers[i + 1];
                if (userNumber != 0 && userFandomName != fandomName && fandomName != getFieldCANT_GAME()) {
                    let fandomInfo = {};
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



                    getCompetitorUserInfo(res, competitorId, function (result) {


                        redisClient.select(0);
                        redisClient.hgetall(getUserInfo(userId), function (err, userInfo) {

                            if (err) {
                                sendMessage.sendErrorMessage(res, ERROR_SERVER, err);
                                return;
                            }

                            const time = moment().format('YYYY.MM.DD HH:mm');
                            userInfo.time = time;

                            setUserLogining.setUserLoginingMatched(res, userId, competitorId, result, userInfo, userFandomName);
                        });

                    });
                });
            }
        });
});





//-------------------* UPDATE_170313~15 *-------------------//


/*
 1. time_format
 - 방어기록 시간 포맷
 */




function time_format(time) {


    let pre_time = new Date(time);
    let old_time = pre_time;
    let now_time = new Date();
    let old = old_time.getTime();
    let now = now_time.getTime();
    let diff_time = Math.abs(now - old);
    let num = 1000*3600*24;
    let diff_day = Math.floor(diff_time/num);
    let day;



    if(diff_day == 0){


        let check = moment(now_time).format('a');

        if(check == 'pm'){
            day = moment(old_time).format('h:mm');
            day = 'PM '+day;
        }else{
            day = moment(old_time).format('h:mm');
            day = 'AM '+day;
        }


    }else {

        day = moment(old_time).format('dddd');

        switch (day) {
            case 'Monday'    : day = 'Mon';
                break;
            case 'Tuesday'   : day = 'Tue';
                break;
            case 'Wednesday'  : day = 'Wed';
                break;
            case 'Thursday'  : day = 'Thu';
                break;
            case 'Friday'  : day = 'Fri';
                break;
            case 'Saturday'  : day = 'Sat';
                break;
            case 'Sunday'  : day = 'Sun';
                break;
            default    : day = 'FDC';
                break;

        }

    }
    return day;

}

router.get('/test', function (req, res) {
    let time = '2017.02.21 16:37';
    time_format(time);
});




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

        let count = 0;
        let temp_matchedInfo;
        let temp_matchedInfos = [];
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

                    let temp_info = matchedInfo[count];
                    temp_matchedInfos.push(temp_info);
                    ++count;
                    return;

                }

                ++count;
                return;

            });


            multi.select(1);

            _.each(temp_matchedInfos, function (info) {

                let infos = JSON.parse(info);
                let string_infos = JSON.stringify(infos);
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


                        /////////////업데이트170315///////////////////

                        /*
                         시간 포맷 변경하기
                         1. 당일: 시간
                         2. 이전: 일 ~ 토요일
                         */

                        let infos = JSON.parse(matchedInfo[index - 1]);
                        let infos_time = infos.time;
                        let change_time = time_format(infos_time);
                        let extend_time= {};
                        extend_time.time = change_time;

                        _.extend(info,extend_time);
                        histories.push(info);


                        ///////////////////////////////////////////////////


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

                    let temp_id;

                    _.each(result, function (info) {
                        temp_id = info.id;
                        multi.exists(userStatus(temp_id));

                    });


                    multi.exec(function (err, isExists) {


                        if (err) {
                            sendMessage.sendErrorMessage(res, ERROR_SERVER, err);
                            return;
                        }

                        isExists.forEach(function (exist, index) {

                            if (index == 0)
                                return;

                            if (exist) {
                                result[index - 1].canGame = false;
                            }else{
                                result[index - 1].canGame = true;
                            }

                        });

                        sendMessage.sendSucceedMessage(res, SUCCEED_RESPONSE, {matchedInfo: result});
                    });



                });


                ///////////////////////여기에 기존에 있는 값을 넣어보자 END ////////////////////////////////

            });

        });

    });

});



//-------------------* UPDATE_170213 *-------------------//

/*

 1. startLogin
 - @id
 - 로그인 전에 사용자의 상태 파악
 - 상대방과의 대전 시간을 통해 상태 정의
 - [추가] 다른기기에서 동일한 아이디 사용 금지
 - 리턴값: yes,no,UsingMultipleDevices
 */


router.post('/startLogin', function (req, res) {


    let id = req.body.id;
    let multi;
    let flag_time;
    let flag_playing = false;
    let flag_id = false;


    multi = redisClient.multi();


    consoleInputLog("id: "+id);


    if (_.isEmpty(id)) {
        sendMessage.sendErrorMessage(res, ERROR_WRONG_INPUT);
        return;
    }



    //0. 다른기기 로그인 확인
    multi.select(3)
        .get(checkStatus(id))
        .exec(function (err, reply) {

            if(err){
                sendMessage.sendErrorMessage(res, ERROR_SERVER, err);
            }


            let flag = reply[1];

            consoleInputLog("flag: "+flag);



            //0-1. 다른기기에 사용하는 경우 -> 생략

            // if(flag){
            //
            //         consoleInputLog("다른기기에서 사용중");
            //         sendMessage.sendSucceedMessage(res, SUCCEED_RESPONSE, "UsingMultipleDevices");
            //         return;
            //
            //     }else{

            //1. 사용자 공격 상대방 확인: 쵠근 배틀기록으로 확인
            consoleInputLog("다른기기 중복 사용 체크 후 로그인");
            multi.select(2)
                .get(recordBattle(id))
                .exec(function (err,reply) {

                    if(err){
                        sendMessage.sendErrorMessage(res, ERROR_SERVER, err);
                    }


                    let info;
                    let time;

                    info = JSON.parse(reply[1]);
                    consoleInputLog("reply: "+reply);


                    if(!info){

                        flag_playing = false;

                    }else{

                        time = info[1];

                        let enemy_time = time;
                        let user_time = moment().format('YYYY.MM.DD HH:mm');
                        let old = new Date (enemy_time);
                        let now = new Date(user_time);

                        let old_time = old.getTime();
                        let now_time = now.getTime();
                        flag_time = DELAY_MATCHING_TIME * 0.1;

                        if(flag_time < now_time - old_time){
                            flag_playing = false;
                        }else{
                            flag_playing = true;
                        }


                    }

                });


            //2. 사용자 방어 상대방 확인: 매칭 전체 기록에서 확인( 상대가 쳐들어 온 기록)
            redisClient.select(1);
            redisClient.lrange(getUserMatchedList(id), 0, -1, function (err, matchedInfo) {


                if (err) {
                    sendMessage.sendErrorMessage(res, ERROR_SERVER, err);
                    return;
                }


                // 매칭 기록이 없다면???
                if (_.isEmpty(matchedInfo)) {

                    redisClient.select(3);
                    let statusInfo = [];
                    statusInfo.push("login");
                    statusInfo.push(current_time());
                    let info = JSON.stringify(statusInfo);
                    redisClient.set(userStatus(id),info);

                    if(flag_playing){
                        sendMessage.sendSucceedMessage(res, SUCCEED_RESPONSE, "no");
                        return;
                    }

                    sendMessage.sendSucceedMessage(res, SUCCEED_RESPONSE, "yes");
                    return;
                }


                let temp_time;
                let temp_id;
                let match_time=[];
                let match_id = [];
                let i=0;

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

                        consoleInputLog("8");

                        let temp;
                        let status;
                        temp = JSON.parse(reply[1]);


                        if(!temp){
                            status = 'logout';
                        }else{
                            status = temp[0];
                        }


                        const enemy_time = match_time[0];
                        const user_time = moment().format('YYYY.MM.DD HH:mm');
                        let old = new Date(enemy_time);
                        let now = new Date(user_time);
                        let old_time = old.getTime();
                        let now_time = now.getTime();
                        let matching_time = DELAY_MATCHING_TIME * 12;



                        //3. 공격자의 최신 공격기록도 확인 -> 사용자 매칭이 되는지 까지 확인
                        multi.select(2)
                            .get(recordBattle(enemy_id))
                            .exec(function (err, reply) {


                                if(err){
                                    sendMessage.sendErrorMessage(res, ERROR_SERVER, err);
                                    return;
                                }

                                consoleInputLog("9");


                                if(!reply){

                                    flag_id = false;

                                }else{

                                    let value = JSON.parse(reply[1]);
                                    1
                                    if( value == "" || value == null || value == undefined || ( value != null && typeof value == "object" && !Object.keys(value).length ) ){

                                        flag_id = false;

                                    }else{

                                        // let other_id = info_battle[0];
                                        let other_id = value[0];

                                        if(other_id == id){
                                            flag_id = true;
                                        }else{
                                            flag_id = false;
                                        }
                                    }



                                }



                                if(now_time-old_time < matching_time && status =="playing" && flag_id == true){


                                    sendMessage.sendSucceedMessage(res, SUCCEED_RESPONSE, "no");

                                }else {


                                    //

                                    if(flag_playing){
                                        sendMessage.sendSucceedMessage(res, SUCCEED_RESPONSE, "no");
                                        return;
                                    }
                                    consoleInputLog("10");


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

            // }


        });

});





//-------------------* UPDATE_170124 *-------------------//


/*

 1. btnResumeToGame
 - @id, @competitorId
 - 대전 > 정지 : 다시 대전으로 돌아오는 경우
 */


router.post('/btnResumeToGame', function (req,res) {


    let id;
    let competitorId;
    let multi;
    let statusInfo = [];
    let info;


    id = req.body.id;
    competitorId = req.body.competitorId;
    multi = redisClient.multi();

    statusInfo.push("playing");
    statusInfo.push(current_time());
    info = JSON.stringify(statusInfo);


    multi.select(3)
        .set(userStatus(id),info)
        .set(userStatus(competitorId), info)
        .expire(userStatus(id),LOGIN_VALID_TIME)
        .expire(userStatus(competitorId),LOGIN_VALID_TIME)
        .exec(function (err) {
            if (err) {
                sendMessage.sendErrorMessage(res, ERROR_SERVER, err);
                return;
            }
            sendMessage.sendSucceedMessage(res, 'user: playing (expire 60), competitor: playing (expire 60)');
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


    let userId;
    let competitorId;
    let multi;

    userId = req.body.id;
    competitorId = req.body.competitorId;
    multi = redisClient.multi();


    if(!competitorId){

        multi.select(3)
            .expire(userStatus(userId),LOGIN_VALID_TIME)
            .exec(function (err) {

                if (err) {
                    sendMessage.sendErrorMessage(res, ERROR_DATABASE, err);
                    return;
                }
                sendMessage.sendSucceedMessage(res, 'user: playing (expire 60)');
            });

    }else{


        multi.select(3)
            .expire(userStatus(userId),LOGIN_VALID_TIME)
            .expire(userStatus(competitorId),LOGIN_VALID_TIME)
            .exec(function (err) {

                if (err) {
                    sendMessage.sendErrorMessage(res, ERROR_DATABASE, err);
                    return;
                }
                sendMessage.sendSucceedMessage(res, 'user: playing (expire 60), competitor: playing(expire 60)');
            });


    }

});


router.post('/resumeOnGame', function (req,res) {


    let userId;
    let competitorId;
    let multi;

    userId = req.body.id;
    competitorId = req.body.competitorId;
    multi = redisClient.multi();

    const statusInfo = [];
    statusInfo.push("playing");
    statusInfo.push(current_time());
    let info = JSON.stringify(statusInfo);


    if(!competitorId){

        multi.select(3)
            .set(userStatus(userId),info)
            .expire(userStatus(userId), LOGIN_VALID_TIME)
            .exec(function (err) {
                if (err) {
                    sendMessage.sendErrorMessage(res, ERROR_DATABASE, err);
                    return;
                }
                sendMessage.sendSucceedMessage(res, 'user: playing(expire 60)');
            });

    }else{

        multi.select(3)
            .set(userStatus(userId),info)
            .set(userStatus(competitorId),info)
            .expire(userStatus(userId), LOGIN_VALID_TIME)
            .expire(userStatus(competitorId), LOGIN_VALID_TIME)
            .exec(function (err) {
                if (err) {
                    sendMessage.sendErrorMessage(res, ERROR_DATABASE, err);
                    return;
                }
                sendMessage.sendSucceedMessage(res, 'user: playing(expire 60), competitor: playing(expire 60)');
            });

    }

});




router.post('/btnExitOnGame', function (req,res) {


    let userId;
    let competitorId;
    let multi;
    const statusInfo = [];
    let info;

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

    let id;
    let competitorId;
    let multi;

    id = req.body.id;
    competitorId = req.body.competitorId;
    multi = redisClient.multi();

    if(!competitorId){

        multi.select(3)
            .del(userStatus(id))
            .exec(function (err) {

                if (err) {
                    sendMessage.sendErrorMessage(res, ERROR_DATABASE, err);
                    return;
                }
                sendMessage.sendSucceedMessage(res, 'user:logout');
            });

    }else{

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

    }


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

        const rowKeys = Object.keys(rowData);

        rowKeys.forEach(function (key) {
            const keys = Object.keys(rowData[key]);

            const multi = redisClient.multi();
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

        const rowKeys = Object.keys(rowData);

        rowKeys.forEach(function (key) {
            const keys = Object.keys(rowData[key]);

            const multi = redisClient.multi();
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







const searchCompetitorId = function (fandomExistingUserList, count, callback) {


    let randomIndex = makeRandom(0, fandomExistingUserList.length);
    let competitorFandomInfos = fandomExistingUserList[randomIndex];
    let competitorFandomName = competitorFandomInfos[getFieldFandomName()];
    const multi = redisClient.multi();


    multi.select(0)
        .srandmember(getCanGameUser(competitorFandomName))
        .exec(function (err, reply) {
            if (err) {
                sendMessage.sendErrorMessage(res, ERROR_SERVER, err);
                return;
            }

            let competitorId = reply[1];




            multi.select(3)
                .exists(userStatus(competitorId))
                .exec(function (err, reply) {


                    ++count;
                    let isLogining = reply[1]; // 0: 로그아웃 1: 로그인 플레이

                    if (count == 5) {
                        competitorId = null;
                        callback(competitorId);
                    }

                    else if (isLogining)
                        searchCompetitorId(fandomExistingUserList, count, callback);

                    else if (!isLogining) {

                        callback(competitorId);

                        const time = moment().format('YYYY.MM.DD HH:mm');
                        let status = "[\"playing\",\"" + time + "\"]";


                        multi.select(3)
                            .set(userStatus(competitorId), status)
                            .exec(function (err) {
                                if (err) {
                                    sendMessage.sendErrorMessage(res, ERROR_SERVER, err);
                                    return;
                                }

                                return;
                            });
                    }

                });
        });
};





const getCompetitorUserInfo = function (res, competitorId, callback) {


    let temp_int = 0;

    const multi = redisClient.multi();
    multi.select(0)
        .hgetall(getUserInfo(competitorId))
        .select(1)
        .hgetall(getUserGameInfo(competitorId, 0))
        .exec(function (err, reply) {


            if (err) {
                sendMessage.sendErrorMessage(res, ERROR_SERVER, err);
                return;
            }

            const competitorInfo = reply[1];
            let temp_check = reply[3];


            if (temp_check == null) {
                setUserLogining.setUserLoginingNoMatched(res, competitorId, 'gameStart');
                return;
            }


            if (competitorId == null) {
                setUserLogining.setUserLoginingNoMatched(res, competitorId, 'gameStart');
                return;
            }


            multi.select(1);

            for (let i = 0; i < GAME_BOARD; i++)
                multi.hgetall(getUserGameInfo(competitorId, i));

            for (let j = 0; j < GAME_BOARD; j++)
                multi.hget(getUserGameInfo(competitorId, j), getFieldGameBalloon());


            multi.hget(getHasStarByLevel(), competitorInfo.level)
                .select(0)
                .zrank(getUserRank(competitorInfo.fandomName), competitorId)
                .exec(function (err, replies) {

                    if (err) {
                        sendMessage.sendErrorMessage(res, ERROR_SERVER, err);
                        return;
                    }

                    let competitorGameInfos = [];
                    let competitorTotalBalloon = 0;

                    for (let i = 1; i < replies.length - 3; i++) {
                        if (i <= GAME_BOARD)
                            competitorGameInfos.push(replies[i]);
                        else
                            competitorTotalBalloon += parseInt(replies[i]);
                    }

                    let competitorHasStarNumber = parseInt(replies[replies.length - 3]);
                    let competitorRank = parseInt(replies[replies.length - 1]) + 1;

                    competitorInfo.competitorRank = competitorRank;

                    const competitorGameCountInfo = {
                        'totalBalloon': competitorTotalBalloon,
                        'bigStar': parseInt(competitorHasStarNumber / 10),
                        'smallStar': competitorHasStarNumber % 10
                    };

                    let result = {};
                    result[getFieldCompetitorInfo()] = competitorInfo;
                    result[getFieldCompetitorGameInfos()] = competitorGameInfos;
                    result[getFieldCompetitorGameCountInfo()] = competitorGameCountInfo;
                    callback(result);
                });
        });
};



router.post('/gameOver', function (req, res) {


    const userId = req.body.userId;
    const userFandomName = req.body.userFandomName;
    const userGetStarCount = req.body.userGetStarCount;
    const userCoinCount = req.body.userCoinCount;
    const userGetBalloonCount = req.body.userGetBalloonCount;
    const competitorId = req.body.competitorId;
    const competitorGameInfo = req.body.competitorGameInfo;
    const multi = redisClient.multi();
    let statusInfo = [];
    let recBattle= [];
    let info;
    let info_battle;



    if (!userId || !userGetStarCount || !userCoinCount
        || !userGetBalloonCount || !competitorId || !competitorGameInfo || !userFandomName) {
        sendMessage.sendErrorMessage(res, ERROR_WRONG_INPUT);
        return;
    }



    statusInfo.push("login");
    statusInfo.push(current_time());
    info = JSON.stringify(statusInfo);

    recBattle.push(competitorId);
    recBattle.push(current_time());
    info_battle = JSON.stringify(recBattle);



    multi.select(0)

        .hincrby(getUserInfo(userId), getFieldStarCount(), userGetStarCount)
        .zincrby(getFandomRank(), userGetStarCount, userFandomName)
        .zincrby(getUserRank(userFandomName), userGetStarCount, userId)
        .hincrby(getUserInfo(userId), getFieldBalloonCount(), userGetBalloonCount)
        .hset(getUserInfo(userId), getFieldCoinCount(), userCoinCount)
        .select(3)
        .set(userStatus(userId),info )
        .del(userStatus(competitorId))
        .select(2)
        .set(recordBattle(userId),info_battle)
        .exec(function (err) {
            if (err) {
                sendMessage.sendErrorMessage(res, ERROR_SERVER, err);
                return;
            }


            let splitedGameInfo = competitorGameInfo.split(",");


            multi.select(1);

            for (let i = 0; i < GAME_BOARD; i++)
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


    const id = req.body.id;
    const userGameInfo = req.body.userGameInfo;

    consoleInputLog("userGameInfo: "+userGameInfo);

    const splitedGameInfo = userGameInfo.split(",");
    const multi = redisClient.multi();


    if (!id || !userGameInfo) {
        sendMessage.sendErrorMessage(res, ERROR_WRONG_INPUT);
        return;
    }


    multi.select(1);
    for (let i = 0; i < GAME_BOARD; i++)
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


        getCompetitorUserInfo(res, revengedId, function (result) {


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
