"use strict";

const request = require("request");
const cheerio = require("cheerio");
const _progress = require('cli-progress');
// const casper = require('casper').create();

const fs = require("fs");
const Promise = require('promise');

// bugs search url
const QUERY_URL = "http://search.bugs.co.kr/track?q=";
const QUERY_URL_SUB = "http://search.bugs.co.kr/integrated?q=";

/**
 * 플레이리스트 파일 가져오기
 */
function loadPlayList() {
    const playList = "./playList.json";
    return JSON.parse(fs.readFileSync(playList, 'utf8'));
}

/**
 * 벅스뮤직에 제목 검색해서 노래 ID 가져오기(단일)
 */
function getSongIdFromBugs(song) {
    return new Promise((resolve, reject) => {
        var keyword = encodeURI(song.name + " " + song.artist);
        var url = QUERY_URL_SUB + keyword;

        request(url, (err, res, body) => {
            if (err) throw err;
            let $ = cheerio.load(body);

            const id = $("#DEFAULT0").find("table.trackList tbody tr").first().find(".check input[type='checkbox']").val();

            resolve({
                "success": id ? true : false,
                "data": id ? id : song
            });
        });
    });
}

/**
 * 플레이 리스트에 있는 모든 노래, 벅스뮤직에서 ID 리스트 가져오기
 */
function listSongIdFromBugs(playList) {
    const progress = new _progress.Bar({}, _progress.Presets.shades_classic);

    let delay = 1000;
    let ids = [];
    let fails = [];

    progress.start(playList.songs.length, 0);

    return new Promise(resolve => {
        playList.songs.forEach(function(song) {
            setTimeout(() => {
                getSongIdFromBugs(song).then(result => {
                    if (result.success) {
                        ids.push(result.data);
                    } else {
                        fails.push(result.data);
                    }

                    progress.increment();

                    if ((ids.length + fails.length) === playList.songs.length) {
                        resolve([ids, fails]);
                        progress.stop();
                    }
                });
            }, delay);
            delay += 500;
        });
    });
}


/**
 * 벅스 플레이리스트에 노래 추가하기
 */
// function appendSongsToBugsPlayList(ids) {
//     casper.start('http://blog.saltfactory.net', function() {
//         var side_today_count = this.evaluate(document.querySelector('#side_today_count').innerText);
//         console.log("오늘의 방문자 수 : " + side_today_count);
//     })
//
//     casper.run();
//
//     const myAlbumId = 240758864;
//
//     var options = {
//         "url": `http://search.bugs.co.kr/user/library/myalbum/${myAlbumId}/append/tracks`,
//         "method": 'GET',
//         "headers": {
//             'User-Agent': "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/57.0.2987.133 Safari/537.36",
//             'Content-Type': 'application/json;charset=UTF-8'
//         },
//         "qs": {
//             "ids": ids
//         }
//     }
//
//     // 요청 시작 받은값은 body
//     request(options, function(error, response, body) {
//         if (!error && response.statusCode == 200) {
//             console.log(body)
//         }
//     })
// }

// MAIN
function main() {
    const playList = loadPlayList();
    listSongIdFromBugs(playList).then(([ids, fails]) => {
        console.log(`total: ${playList.songs.length} / success: ${ids.length} / fail: ${fails.length}`)

        console.log("# id list");
        console.log(ids);

        if (fails.length > 0) {
            console.log("# fail list");
            fails.forEach(function(item) {
                console.log(`${item.name} / ${item.artist}`);
            });
        }

        const myAlbumId = 240758864;
        const splitCount = 100; // max 300

        console.log(">> 웹브라우저 켜고 벅스 로그인한 뒤 url 입력.");
        for (let index = 0; index < Math.ceil(ids.length / splitCount); index++) {
            const splitedIds = ids.slice(index * splitCount, (index + 1) * splitCount);
            const scriptCommand = `http://search.bugs.co.kr/user/library/myalbum/${myAlbumId}/append/tracks?ids=${splitedIds.join(",")}`;
            console.log(scriptCommand);
        }
    });
}

main();
