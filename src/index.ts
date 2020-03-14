import { Client, Message, TextChannel } from 'discord.js';
// create a copy of example.config.ts and call it config.ts - also put your token in
import config from './config';
import commands from './commands/commands';
import { setupGuild } from './rolebot';
import loadReleases from './releases/releases';
import Release from './releases/release';

const bot = new Client();

bot.once('ready', async (_: any) => {
    try {
        console.log('Setting up releases...');
        const releases: Release[] = await loadReleases();
        setInterval(async () => {
            try {
                const date = new Date();
                // identify what to release
                const toRelease = releases.filter(release => {
                    release.day === date.getDay() &&
                        release.hour === date.getHours() &&
                        release.minutes === date.getMinutes()
                });

                if (toRelease.length <= 0) return;

                // setup all guilds
                await Promise.all(bot.guilds.cache.map(g => setupGuild(g)));
                // send each release message to each guild
                toRelease.forEach(release => {
                    bot.guilds.cache.forEach(async g => {
                        let c = g.channels.cache.find(c => c.name === 'chapter_not_read');
                        if (c !== undefined && c.type === 'text') {
                            try {
                                var releaseChannel = (c as TextChannel);
                                await releaseChannel.send(release.message);
                            } catch (e) {
                                console.log('Could not send release-message', e);
                            }
                        }
                    });
                })
            } catch (e) {
                console.log('Setting up for releases failed. Exiting...', e);
                process.exit();
            }
        }, 6000)
    } catch (e) {
        console.log('Loading releases failed. Exiting...', e);
        process.exit();
    }
});


bot.on('message', async (msg: Message) => {
    const prefix = config.prefix;

    if (!msg.content.startsWith(prefix) || msg.author.bot) return; // ignore all others

    const args = msg.content.slice(prefix.length).split(/ +/);
    const commandName = args.shift()?.toLowerCase();

    if (commandName) {
        if (commands.has(commandName)) {
            try {
                await commands.get(commandName)?.command(msg, args);
            } catch (e) {
                console.log(`Executing command ${commandName} failed. \nReason:`, e);
                msg.channel.send('Something went wrong.');
            }
        }
    }
});

bot.login(config.token);