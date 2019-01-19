const os = require("os");
const fs = require("fs");
const readline = require("readline");
const Discord = require("discord.js");

const bot = new Discord.Client();

const randRange = (min, max) => {
    const min_ = Math.ceil(min);
    const max_ = Math.floor(max);
    return Math.floor(Math.random() * (max_ - min_ + 1)) + min_;
}

function makeDirForUser(user) {
    return new Promise((res, rej) => {
        fs.mkdir(`./users/${user.username}`, (err) => {
            if (err) {
                rej(new Error(err));
            } else {
                console.log(`Directory for user ${user.username} created`);
                fs.writeFile(`./users/${user.username}/creation_dump.json`, JSON.stringify(user), (err) => {
                    if (err) {
                        rej(new Error(err));
                    } else {
                        console.log(`Info dump file created for user ${user.username}`);
                        res();
                    }
                });
            }
        });
    });
}

function logStatus(username, old_status, new_status) {
    const path = `./users/${username}/status.json`;
    const e_obj = {
        date: new Date().toUTCString(),
        old_status: old_status,
        new_status: new_status
    };
    return new Promise((res, rej) => {
        fs.exists(path, (exists) => {
            if (exists) {
                fs.readFile(path, (err, data) => {
                    if (err) {
                        rej(new Error(err));
                    }
                    const parsed = JSON.parse(data);
                    parsed.status_updates.push(e_obj);
                    fs.writeFile(path, JSON.stringify(parsed), (err) => {
                        if (err) {
                            rej(new Error(err));
                        }
                        console.log(`Status update logged for ${username}`);
                        res();
                    });
                });
            } else {
                const initial_state = {
                    created: new Date().toUTCString(),
                    username: username,
                    status_updates: [
                        e_obj
                    ]
                };
                fs.writeFile(path, JSON.stringify(initial_state), (err) => {
                    if (err) {
                        rej(new Error(err));
                    }
                    console.log(`Status log file created for ${username}`);
                    console.log(`Status update logged for ${username}`);
                    res();
                });
            }
        });
    });

}

bot.on('ready', () => {
    console.log('Once the bot is ready this message will show!');
});


const pathExists = (path) => {
    return new Promise((res) => {
        fs.exists(path, (exists) => {
            res(exists);
        })
    });
};

const forceWriteFile = async (path, data) => {
    const split = path.split(`/`);
    const [dir_path, file_name] = [split.slice(0, -1).reduce((acc, v) => acc + `/` + v), split[split.length - 1]];

    const dir_exists = await pathExists(dir_path);
    await new Promise((res, rej) => {
        if (dir_exists) {
            res();
        }
        fs.mkdir(dir_path, { recursive: true }, (err) => {
            if (err) {
                rej(new Error(err));
            }
            res();
        });
    });

    await new Promise((res, rej) => {
        fs.writeFile(path, data, (err) => {
            if (err) {
                rej(new Error(err));
            }
            res();
        });
    })
};



const logMessage = async (username, message) => {
    console.log(`[${message.channel.name}] ${username}: ${message.content}`);

    const dir_path = `./users/${username}`;
    const file_path = `${dir_path}/message_log.json`;

    const file_exists = await pathExists(file_path);
    if (file_exists) {
        const json_log = await new Promise((res, rej) => {
            fs.readFile(file_path, (err, data) => {
                if (err) {
                    rej(new Error(err));
                }
                res(JSON.parse(data));
            })
        });
        json_log.messages.push({
            channel: message.channel.name,
            content: message.content,
            mentions: {
                users: message.mentions.users,
                members: message.mentions.members,
                channels: message.mentions.channels,
                roles: message.mentions.roles
            }
        });
        await forceWriteFile(file_path, JSON.stringify(json_log));
    } else {
        await forceWriteFile(file_path, JSON.stringify({
            created: new Date().toUTCString(),
            username: username,
            messages: [
                {
                    channel: message.channel.name,
                    content: message.content,
                    mentions: {}
                }
            ]
        }));
    }
}

bot.on('message', async (message) => {
    logMessage(message.member.user.username, message);
    if (message.content[0] === `>`) {
        const command = `${message.content.substr(1, message.content.indexOf(` `) - 1)}`;
        const params = message.content.substr(message.content.indexOf(` `) + 1).split(`, `);
        switch (command) {
            case `random`:
                if (params.length < 2) {
                    message.channel.send(`Need a numeric range \`<min>\` \`<max>\` to produce a random number`);
                } else {
                    message.channel.send(`${randRange(params[0], params[1])}`)
                }
                break;
            case `status`:
                if (params.length < 1) {
                    message.channel.send(`Who's status? Missing \`<username>\``);
                } else {
                    message.channel.send(await (async () => {
                        try {
                            const json = JSON.parse(await new Promise((res, rej) => {
                                fs.readFile(`./users/${params[0]}/status.json`, (err, data) => {
                                    if (err) {
                                        rej(new Error(err));
                                    } else {
                                        res(data);
                                    }
                                });
                            }));
                            const last_entry = json.status_updates[json.status_updates.length - 1];
                            if (last_entry.new_status === `online`) {
                                return `${params[0]} is online right now! Status last became \`${last_entry.new_status}\` at ${last_entry.date}`;
                            } else {
                                return `${params[0]} is offline at the moment. Status became \`${last_entry.new_status}\` at: ${last_entry.date}`;
                            }
                        } catch(err) {
                            return `Something went wrong (I probably have no records for ${params[0]} yet)!`;
                        }
                        
                    })());
                }
                break;
            case `choose`:
                console.log(`choosing`);
                if (params.length < 1) {
                    message.channel.send(`I can't choose if I have no options :robot:`);
                } else if (params.length === 1) {
                    message.channel.send(`Is this really a choice if I only have one option..?`);
                } else {
                    message.channel.send(`${params[randRange(0, params.length - 1)]}`)
                }

                break;
            case `Heil the Chonkiness`: message.channel.send(`RESISTANCE IS FUTILE`)
                
                break;
            case`KFC`: message.channel.send(`:snowflake:`)
                
                break;
            case `rock` || `spock` || `paper` || `lizard` || `scissors` || `chonk`:
                message.channel.send(`Feelin' lucky, punk?`);
                if (params.length < 1) {
                    message.channel.send(`Guess not, play a real hand you yellabelly! :gun:`);
                } else {
                    var hand = ['rock', 'spock', 'paper', 'lizard', 'scissors', 'chonk'];
                    var play = hand[Math.floor(Math.random()*hand.length)];
                    message.channel.send(`suck on my` + play);
                    
                    #NEED STRINGS
                    if(case==hand){
                        message.channel.send(`TIE: CHONKBOT STILL WINS!`);
                        #ASSIGN NUMBERS OR CREATE LIST WITH STRINGS?
                    } else if ([LOCATION OF CASE IN LIST - LOCATION OF HAND] == 1 || == 2 ):
        message.channel.send(`KING CHONKBOT WINS`)
    else if ([LOCATION OF CASE IN LIST - LOCATION OF HAND] == 3 || == 4 ):
        message.channel.send(`BOTH WIN`)
                    }
                }
                
        }
    }
});

bot.on(`presenceUpdate`, async (old_member, new_member) => {
    const dir_path = `./users/${old_member.user.username}`;

    const dir_exists = await new Promise(res => {
        fs.exists(dir_path, (exists) => {
            res(exists);
        })
    });
    if (!dir_exists) {
        await makeDirForUser(old_member.user);
    }
    await logStatus(old_member.user.username, old_member.user.presence.status, new_member.user.presence.status);
});

