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

const readLastLine = (path) => {
    return new Promise((res, rej) => {
        const r_stream = fs.createReadStream(path);
        const rli = readline.createInterface({
            input: r_stream,
            crlfDelay: Infinity
        });

        rli.on(`error`, (err) => {
            rej(new Error(err));
        })

        let last;
        rli.on(`line`, (line) => {
            last = line;
        })

        rli.on(`close`, () => {
            res(last);
        })
    });
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

bot.on('message', async (message) => {
    if (message.content[0] === `>`) {
        const [command, ...params] = message.content.substr(1).split(` `);
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
                            console.log(last_entry);
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
        }
    }
});

bot.on(`presenceUpdate`, async (old_member, new_member) => {
    console.log(`PU::${old_member.user.username}:${old_member.user.presence.status}|${new_member.user.username}:${new_member.user.presence.status}`);
    const dir_path = `./users/${old_member.user.username}`;

    const dir_exists = await new Promise(res => {
        fs.exists(dir_path, (exists) => {
            res(exists);
        })
    });
    if (!dir_exists) {
        console.log(`need to make this dir!`);
        await makeDirForUser(old_member.user);
    }
    await logStatus(old_member.user.username, old_member.user.presence.status, new_member.user.presence.status);
})

bot.login(`NTM1NTQxMDQ1MDMxODYyMzAy.DyJpdg.rHek3NEvGHSBkCkkkxyxlNNsiwQ`);