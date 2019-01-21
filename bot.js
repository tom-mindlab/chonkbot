const fs = require("fs");
const Discord = require("discord.js");
const mkdirp = require("mkdirp");

const bot = new Discord.Client();

const randRange = (min, max) => {
    const min_ = Math.ceil(min);
    const max_ = Math.floor(max);
    return Math.floor(Math.random() * (max_ - min_ + 1)) + min_;
}

function makeDirForUser(user) {
    return new Promise((res, rej) => {
        mkdirp(`./users/${user.username}`, (err) => {
            if (err) {
                rej(new Error(err));
            } else {
                console.log(`Directory for user ${user.username} created`);
                fs.writeFile(`./users/${user.username}/creation_dump.json`, JSON.stringify({
                    date: new Date().toUTCString(),
                    username: user.username,
                    id: user.id,
                    bot: user.bot
                }), (err) => {
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
        mkdirp(dir_path, (err) => {
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

const readFileIfExists = async (path) => {
    return new Promise(async (res, rej) => {
        if (await pathExists(path)) {
            fs.readFile(path, (err, data) => {
                if (err) {
                    rej(new Error(err));
                }
                res(data);
            })
        } else {
            res(undefined); // is this odd?
        }
    });
}

const parseMessageContent = async (content) => {
    
}

const logMessage = async (message) => {
    const channame = message.channel.name;
    const username = message.member.user.username;
    console.log(`[${message.channel.name}] ${username}: ${message.content}`);

    const user_file_path = `./users/${username}/message_log.json`;
    const user_data = await readFileIfExists(user_file_path);
    if (user_data) {
        const out = JSON.parse(user_data);
        out.messages.push({
            date: new Date().toUTCString(),
            channel: channame,
            raw_content: message.content,
            mentions: {
                users: message.mentions.users.map(v => v.username),
                channels: message.mentions.channels.map(v => v.name),
                roles: message.mentions.roles.map(v => v.name)
            }
        });
        await forceWriteFile(user_file_path, JSON.stringify(out));
    } else {
        await makeDirForUser(message.member.user);
        await forceWriteFile(user_file_path, JSON.stringify({
            created: new Date().toUTCString(),
            username: username,
            messages: [
                {
                    date: new Date().toUTCString(),
                    channel: channame,
                    content: message.content,
                    mentions: {
                        users: message.mentions.users.map(v => v.username),
                        channels: message.mentions.channels.map(v => v.name),
                        roles: message.mentions.roles.map(v => v.name)
                    }
                }
            ]
        }));
    }

    // data redundancy because i just dont care
    const channel_file_path = `./channels/${channame}/message_log.json`;
    const channel_data = await readFileIfExists(channel_file_path);
    if (channel_data) {
        const out = JSON.parse(channel_data);
        out.messages.push({
            date: new Date().toUTCString(),
            username: username,
            content: message.content,
            mentions: {
                users: message.mentions.users.map(v => v.username),
                channels: message.mentions.channels.map(v => v.name),
                roles: message.mentions.roles.map(v => v.name)
            }
        });
        await forceWriteFile(channel_file_path, JSON.stringify(out));
    } else {
        await forceWriteFile(channel_file_path, JSON.stringify({
            created: new Date().toUTCString(),
            channame: channame,
            messages: [
                {
                    date: new Date().toUTCString(),
                    username: username,
                    content: message.content,
                    mentions: {
                        users: message.mentions.users.map(v => v.username),
                        channels: message.mentions.channels.map(v => v.name),
                        roles: message.mentions.roles.map(v => v.name)
                    }
                }
            ]
        }))
    }
}

const shuffleArr = (arr) => {
	const output_arr = arr.slice();
    let currentIndex = output_arr.length;

    while (currentIndex !== 0) {
        const randIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;
        
        // swap these elements
        [output_arr[currentIndex], output_arr[randIndex]] = [output_arr[randIndex], output_arr[currentIndex]];
    }
    return output_arr;
}

const executeCommand = async (command, params, mentions, channel, authorised) => {
    switch (command) {
        case `random`:
            if (params.length < 2) {
                channel.send(`Need a numeric range \`<min>\` \`<max>\` to produce a random number`);
            } else {
                channel.send(`${randRange(params[0], params[1])}`)
            }
            break;
        case `status`:
            if (params.length < 1) {
                channel.send(`Who's status? Missing \`<username>\``);
            } else {
                channel.send(await (async () => {
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
            if (params.length < 1) {
                channel.send(`I can't choose if I have no options :robot:`);
            } else if (params.length === 1) {
                channel.send(`Is this really a choice if I only have one option..?`);
            } else {
                channel.send(`${params[randRange(0, params.length - 1)]}`)
            }
            break;
        case `userstats`:
            if (params.length < 1) {
                channel.send(`Who's status? Missing \`<username>\`|\`snowflake\``);
            } else {
                const log_data = await readFileIfExists(`users/${params[0]}/message_log.json`);
                if (log_data) {
                    channel.send(`${params[0]} has sent ${JSON.parse(log_data).messages.length} messages (that I've recorded)!`);
                } else {
                    channel.send(`Something went wrong (I probably have no records for ${params[0]} yet)!`);
                }
            }
            break;
        case `8ball`: 
            if (params.length < 1) {
                channel.send(`You need to ask a question first...`);
            } else {
                const answers = await readFileIfExists(`8ball.json`);
                if (answers) {
                    const out = JSON.parse(answers);
                    channel.send(out.answers[randRange(0, out.answers.length - 1)]);
                } else {
                    channel.send(`The 8ball has been misplaced, can't answer`);
                }
            }
            break;
        case `rank`:
            if (params.length < 1) {
                channel.send(`You haven't given my anything to rank!`);
            } else if (params.length === 1) {
                channel.send(`Not much of a ranking with only one item...`);
                channel.send(`${params[0]}`);
            } else {
                let out = ``;
                for (const [index, item] of shuffleArr(params).entries()) {
                    out = `${out}${index + 1}: ${item}\n`;
                }
                channel.send(out);
            }
            break;
        case `kick`:
            if (!authorised) {
                channel.send(`You aren't authorised to use this command`);
            } else if (params.length < 1) {
                channel.send(`Kick who? Missing \`<username>\``);
            } else {
                for (const member of mentions.members) {
                    member.kick(`${params[1] || ``}`);
                }
            }
            
    }
}

const authorisedUser = async (user) => {
    const au_data = await readFileIfExists(`./authorised_users.json`);
    if (au_data) {
        const out = JSON.parse(au_data);
        for (const authorised_user of out.authorised_users) {
            if (user.id === authorised_user.id) {
                return true;
            }
        }
    }
    return false;
}

bot.on('message', async (message) => {
    // console.log(message.mentions);
    // console.log(message.mentions.users.map(v => v.username));
    // console.log(message.mentions.channels.map(v => v.name));
    // console.log(message.mentions.roles.map(v => v.name));
    logMessage(message);
    if (message.content[0] === `>`) {
        const command = `${message.content.substr(1, message.content.indexOf(` `) - 1)}`;
        const params = message.content.substr(message.content.indexOf(` `) + 1).split(`, `);
        executeCommand((command) ? command : message.content, params, message.mentions, message.channel, await authorisedUser(message.member.user));
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

