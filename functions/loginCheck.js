/**
 * Created by TaerinYoon on 2016. 5. 17..
 */


exports.LoginCheck = setInterval(function (redisClient, request, id) {










    //console.log(redisClient, id, head, body, time);
    var multi = redisClient.multi();
    multi.select(3)
        .hset('logining:' + id, request, time)
        .sadd("LOGIN_NOW", id)
        .exec(function (err, reply) {
            var multi = redisClient.multi();
            multi.select(3)
                .hdel()
                .exec(function (err, reply) {

                })
        });

    //logger.Log("GetCompetitor",competitorFandomName) ->로거쓰는법!
}, 60000);