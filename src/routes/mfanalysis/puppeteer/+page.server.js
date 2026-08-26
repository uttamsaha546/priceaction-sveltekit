import { db } from "./api/saveFundData/+server";
import { getPortfolioStmt } from "./api/db";

export async function load({ depends }) {
    const rows = getPortfolioStmt.all();

    depends('app:portfolio');

    const res = await fetch('https://www.amfiindia.com/online-center/portfolio-disclosure');
    const html = await res.text();

    // 1. Get the content of self.__next_f.push([1, "..."])
    const match = html.match(
        /<script>self\.__next_f\.push\(\[1,"c:([\s\S]*?)"\]\)<\/script>/
    );

    if (!match) {
        throw new Error("Next.js payload not found");
    }

    // 2. Decode the JavaScript string
    const payload = JSON.parse(`"${match[1]}"`);

    // payload is now something like:
    // c:["$","$L17",null,{"members":[...]}]

    // 3. Find {"members":
    const start = payload.indexOf('{"members":');

    if (start === -1) {
        throw new Error("members not found");
    }

    // 4. Extract the JSON object using bracket counting
    let depth = 0;
    let inString = false;
    let escaped = false;
    let end = -1;

    for (let i = start; i < payload.length; i++) {
        const c = payload[i];

        if (escaped) {
            escaped = false;
            continue;
        }

        if (c === '\\' && inString) {
            escaped = true;
            continue;
        }

        if (c === '"') {
            inString = !inString;
            continue;
        }

        if (!inString) {
            if (c === '{') depth++;

            if (c === '}') {
                depth--;

                if (depth === 0) {
                    end = i + 1;
                    break;
                }
            }
        }
    }

    if (end === -1) {
        throw new Error("Could not find end of members object");
    }

    // 5. Parse the object
    const data = JSON.parse(payload.slice(start, end));

    // 6. Get members
    const members = data.members;

    // console.log(members);
    // console.log(members.length);
    // console.log(members[0]);


    return {
        amcList: members
    };
}
