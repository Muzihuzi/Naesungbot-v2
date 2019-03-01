const ytSearch = require('yt-search');
const ytdl = require('ytdl-core');
const Discord = require('discord.js');
const stringhandler = require('../stringhandler');
const config = require('../botsetting.json');
const request = require('request');

module.exports = {
    'play': (msg, command) => {
        function play(url) {
            ytdl.getInfo(url, {downloadURL: true}, (err, info) => {
                if (err) throw err;
                let embed = new Discord.RichEmbed()
                    .setTitle(info.title)
                    .setURL(url)
                    .addField(`동영상 길이`,`${info.length_seconds}초`)
                    .setImage(`https://i.ytimg.com/vi_webp/${info.video_id}/maxresdefault.webp`)
                    .setAuthor(`${msg.author.tag}`, msg.author.displayAvatarURL)
                    .setColor(`${config.color}`)
                    .setFooter(`출처: ${info.author.name}`)
                    .setTimestamp();
                // embed.addField('설명', info.description, true); 이건 embed 1024자 넘으면 에러 떠서 안씁니다
                msg.channel.send(embed);
            });
            msg.member.voiceChannel.join().then(connection => {
                let streamOptions = {seek: 0, volume: 1, bitrate: 64000};
                const stream = ytdl(url, {filter: 'audioonly'});
                const dispatcher = connection.playStream(stream, streamOptions);
                dispatcher.on("end", end => {
                    msg.channel.send("노래가 끝났습니다!");
                    msg.member.voiceChannel.leave();
                });
            }).catch(err => console.log(err));
        }

        if (!msg.member.voiceChannel) return msg.channel.send("음성채널에 들어가주세요!");
        if (msg.guild.me.voiceChannel) return msg.channel.send(`이미 ${msg.guild.me.voiceChannel}에서 노래를 하고 있습니다`);
        const raw = stringhandler.cutTextHead('play ', command);
        if (!raw) return msg.channel.send("인자가 없습니다");
        let url = raw;
        let validate = ytdl.validateURL(url);
        if (!validate) {
            ytSearch(url, function (err, r) {
                try {
                    let embed = new Discord.RichEmbed()
                        .setAuthor(`${msg.author.tag}`, msg.author.displayAvatarURL)
                        .setColor(`${config.color}`)
                        .setTitle(url + ' 검색 결과');
                    for (let i = 0; i < 5; i++) {
                        embed.addField(i + 1 , `[${r.videos[i].title}](${'https://youtube.com'}${r.videos[i].url})` + '\n' + r.videos[i].author.name + "\n", true);
                    }
                    msg.channel.send(embed);
                    function checkRecursive(msg) {
                        const collector = new Discord.MessageCollector(msg.channel, m => m.author.id === msg.author.id, {
                            max: 1,
                            time: 100000
                        });
                        collector.on('collect', m => {
                            const check = (message) => {
                                let num = Number(message.content);
                                play("https://youtube.com" + r.videos[num-1].url);
                            };
                            try {
                                check(m);
                            } catch (e) {
                                m.channel.send("1 ~ 5 사이의 숫자로 입력해 주세요.");
                                checkRecursive(msg);
                            }
                        });
                    }
                    checkRecursive(msg);
                } catch (e) {
                    msg.channel.send("검색 결과가 없습니다!");
                    console.log(e);
                }
            });
        } else {
            play(url);
        }
    },
    'exit': (msg, command) => {
        try {
            msg.member.voiceChannel.leave();
        } catch (e) {
            
        }
    },
    'sc': (msg, command) => {
        const raw1 = stringhandler.cutTextHead('sc ', command);
        if (!raw1) return msg.channel.send("인자가 없습니다");
        if (raw1.indexOf("soundcloud.com") !== -1) {
            request("http://api.soundcloud.com/resolve.json?url=" + raw1 + "&client_id=71dfa98f05fa01cb3ded3265b9672aaf", function (error, response, body) {
                if (error) msg.reply(error);
                else if (response.statusCode === 200) {
                    body = JSON.parse(body);
                    let embed = new Discord.RichEmbed()
                        .setAuthor(`${msg.author.tag}`, msg.author.displayAvatarURL)
                        .setColor(`${config.color}`)
                        .setTitle(body.title)
                        .setURL(body.uri) // url 아니구 uri 맞습니다
                        .setThumbnail(body.artwork_url)
                        .addField("정보", " by **" + body.user.username + "** *(" + Math.floor(body.duration / 1000) + " 초)* ")
                        .setFooter("#" + body.id);
                    msg.channel.send(embed);
                }
            });
        }
    },
};
