const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

(async () => {
    const groups = []
    {
        const { data } = await axios.get(
            'https://rustlabs.com/group=itemlist'
        );

        const $ = cheerio.load(data);

        $('.info-block').each((i, el) => {
            let groupIndex = -1;
            $(el).find('h2, a').each((ci, child) => {
                if (child.tagName === "h2") {
                    groups.push({ name: child.firstChild.data, children: [] });
                    groupIndex++;
                } else if (child.tagName === "a") {
                    groups[groupIndex].children.push({ url: child.attribs.href, name: child.children[1].firstChild.data });
                }

            })
        });
    }



    const reqs = []
    let it = 0;
    groups.forEach((g, i, groups) => {
        g.children.forEach(async (c, ci) => {

            const req = axios.get(
                `https://rustlabs.com${c.url}`
            );
            reqs.push(req);
            it++;


            console.log(`Fetching: https://rustlabs.com${c.url}`)
            const { data } = await req;

            const $ = cheerio.load(data);
            const t = $('.stats-table tbody tr:nth-child(3) td:nth-child(2)').first().text();

            groups[i].children[ci].time = t;

        })
        it++;
    })

    await Promise.all(reqs);

    let csv = "Name, Despawn time, Type\n";
    csv += groups.reduce((gac, g) => (gac + g.children.reduce((acc, c) => (acc + `${c.name},${c.time},${g.name}\n`), "")), "");
    fs.writeFileSync('./data.csv', csv);

    let md = "";
    md += groups.map((g) => `## ${g.name}\n | Name | Despawn time | \n | --- | --- | \n` + (g.children.reduce((acc, c) => (acc + ` | ${c.name} | ${c.time} | \n`), ""))).join("\n");
    fs.writeFileSync('./data.md', md);
})();
