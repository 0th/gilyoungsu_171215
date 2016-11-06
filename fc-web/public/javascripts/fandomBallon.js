/**
 * Created by hyunwoo on 2016-08-03.
 */
var fandomBallon = {};
$.get('/javascripts/fandomBallon', function(d){
    var lines = d.split('\n');

    _.map(lines, function(e){
        var k = e.split(',');
        var key = k[0];
        var value = k[1];
        fandomBallon[key] = value;

    })

    //console.log(fandomBallon);


    _.map($('.ballonImg'), function(e){
        var ele = $(e);

        var url = '/imgs/ballons/'+ fandomBallon[ele.attr('id')] + '.png'
        ele.attr('src', url )
             .css('background-size','contain')
             .css('background-repeat','no-repeat')
             .css('background-position','center');


    })




})
