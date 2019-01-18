const fs = require("fs");
const readline = require("readline");

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
    })
}

async function main() {
    console.log(await readLastLine(`./users/test/logins.txt`));
}

main();