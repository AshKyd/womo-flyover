import { createRestAPIClient } from "masto";
// import { BskyAgent } from "@atproto/api";
export async function post(status) {
    return;
    const masto = createRestAPIClient({
        url: process.env.MASTODON_SERVER,
        accessToken: process.env.ACCESS_TOKEN,
    });

    console.log(new Date().toISOString(), "tooting", status);

    await masto.v1.statuses
        .create({
            status: status,
            visibility: "unlisted",
        })
        .catch((e) => {
            console.error("couldn't post to mastodon", e.message);
        });

    //   const agent = new BskyAgent({
    //     service: "https://bsky.social",
    //   });
    //   await agent
    //     .login({
    //       identifier: secrets.bskyUser,
    //       password: secrets.bskyPass,
    //     })
    //     .then(() =>
    //       agent.post({
    //         text: status,
    //         createdAt: new Date().toISOString(),
    //       })
    //     )
    //     .catch((e) => {
    //       console.log("couldn't post to bsky", e.message);
    //     });
}
