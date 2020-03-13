import { Guild, Role, GuildChannel, GuildMember, TextChannel, Client, CategoryChannel } from "discord.js";
import RoleColors from "./role-colors";
import Release from "./releases/release";
import ChannelTypes from "./channelTypes";

function notifyRelease(client: Client, message: string): void {
    client.guilds.array().forEach(g => {
        let c = g.channels.find(c => c.name === 'chapter_not_read');
        if (c.type === 'text') {
            (c as TextChannel).send(message);
        }
    });
}

async function setupReleaseNotifier(client: Client, release: Release): Promise<void> {
    setInterval(async () => {
        let date = new Date();
        if (
            release.day === date.getDay() &&
            release.hour === date.getHours() + 1 &&
            release.minutes === date.getMinutes()
        ) {
            try {
                await setupAllGuildsOfBot(client);
                notifyRelease(client, release.message);
            } catch (e) {
                console.log(e);
            }
        }
    }, release.checkIntervalSeconds * 1000)
}

async function setupAllGuildsOfBot(client: Client) {
    return client.guilds.array().forEach(setupGuild);
}

async function setupGuild(g: Guild) {
    Promise.all([
        getOrCreateRole(g, 'chapter_read', RoleColors.DARK_PURPLE, true),
        getOrCreateRole(g, 'chapter_not_read', RoleColors.BLUE, true),
        getOrCreateChannelOnGuild(g, 'chapter_read', ChannelTypes.TEXT),
        getOrCreateChannelOnGuild(g, 'chapter_not_read', ChannelTypes.TEXT),
        getOrCreateChannelOnGuild(g, 'Textkanäle', ChannelTypes.CATEGORY)
    ]).then(data => {
        let chapterReadRole = data[0];
        let chapterNotReadRole = data[1];
        let chapterReadChannel = data[2] as TextChannel;
        let chapterNotReadChannel = data[3] as TextChannel;
        let parentChannel = data[4] as CategoryChannel;

        return Promise.all([
            chapterReadChannel.setParent(parentChannel),
            chapterNotReadChannel.setParent(parentChannel),
            chapterNotReadChannel.overwritePermissions(g, { VIEW_CHANNEL: false }),
            chapterReadChannel.overwritePermissions(chapterReadRole, { 'VIEW_CHANNEL': true }),
            chapterNotReadChannel.overwritePermissions(chapterNotReadRole, { 'VIEW_CHANNEL': true }),
            chapterNotReadChannel.overwritePermissions(chapterReadRole, { 'VIEW_CHANNEL': true }),
            g.members.forEach(async m => {
                await manageRoles(m, [chapterNotReadRole], [chapterReadRole]);
            })
        ])
    })
}

async function getOrCreateRole(g: Guild, name: string, color: RoleColors, mentionable: boolean): Promise<Role> {
    let role: Role | undefined = g.roles.find(r => r.name === name);
    if (role) return role;
    return g.createRole({
        name: name,
        color: color,
        mentionable: mentionable
    });
}

async function getOrCreateChannelOnGuild(g: Guild, name: string, channelType: ChannelTypes): Promise<GuildChannel> {
    let channel: GuildChannel | undefined = g.channels.find(c => c.name === name);
    if (channel) return channel;
    return g.createChannel(name, channelType);
}

async function manageRoles(m: GuildMember, rolesToAdd: Role[], rolesToRemove: Role[]) {
    if (!m.user.bot) {
        return Promise.all([m.addRoles(rolesToAdd), m.removeRoles(rolesToRemove)])
    }
}

async function setRead(g: Guild, m: GuildMember) {
    let chapterReadRole = await getOrCreateRole(g, 'chapter_read', RoleColors.DARK_PURPLE, true);
    let chapterNotReadRole = await getOrCreateRole(g, 'chapter_not_read', RoleColors.BLUE, true);
    return manageRoles(m, [chapterReadRole], [chapterNotReadRole]);
}

async function setNotRead(g: Guild, m: GuildMember) {
    let chapterReadRole = await getOrCreateRole(g, 'chapter_read', RoleColors.DARK_PURPLE, true);
    let chapterNotReadRole = await getOrCreateRole(g, 'chapter_not_read', RoleColors.BLUE, true);
    return manageRoles(m, [chapterNotReadRole], [chapterReadRole]);
}

export { setupGuild, setupReleaseNotifier, setRead, setNotRead };