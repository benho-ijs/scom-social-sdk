import { Nip19, Event, Keys } from "../core/index";
import { ICommunityBasicInfo, ICommunityInfo, IConversationPath, INewCommunityPostInfo, INostrEvent, INostrMetadata, INostrMetadataContent, INoteCommunityInfo, IRetrieveCommunityPostKeysByNoteEventsOptions, IRetrieveCommunityPostKeysOptions, IRetrieveCommunityThreadPostKeysOptions, IUserActivityStats, IUserProfile } from "./interfaces";

interface IFetchNotesOptions {
    authors?: string[];
    ids?: string[];
}

interface IFetchMetadataOptions {
    authors?: string[];
    decodedAuthors?: string[];
}

interface IFetchRepliesOptions {
    noteIds?: string[];
    decodedIds?: string[];
}

function determineWebSocketType() {
	if (typeof window !== "undefined"){
        return WebSocket;
	}
	else{
        // @ts-ignore
        let WebSocket = require('ws');
        return WebSocket;
	};
};

class NostrWebSocketManager {
    protected _url: string;
    protected ws: any;
    protected requestCallbackMap: Record<string, (message: any) => void> = {};

    constructor(url) {
        this._url = url;
    }

    get url() {
        return this._url;
    }

    set url(url: string) {
        this._url = url;
    }

    generateRandomNumber(): string {
        let randomNumber = '';
        for (let i = 0; i < 10; i++) {
            randomNumber += Math.floor(Math.random() * 10).toString();
        }
        return randomNumber;
    }

    establishConnection(requestId: string, cb: (message: any) => void) {
        const WebSocket = determineWebSocketType();
        this.requestCallbackMap[requestId] = cb;
        return new Promise<WebSocket>((resolve) => {
            const openListener = () => {
                console.log('Connected to server');
                this.ws.removeEventListener('open', openListener);
                resolve(this.ws);
            }
            if (!this.ws || this.ws.readyState === WebSocket.CLOSED) {
                this.ws = new WebSocket(this._url);
                this.ws.addEventListener('open', openListener);
                this.ws.addEventListener('message', (event) => {
                    const messageStr = event.data.toString();
                    const message = JSON.parse(messageStr);
                    let requestId = message[1];
                    if (message[0] === 'EOSE') {
                        if (this.requestCallbackMap[requestId]) {
                            this.requestCallbackMap[requestId](message);
                            delete this.requestCallbackMap[requestId];
                        }
                    }
                    else if (message[0] === 'EVENT') {
                        if (this.requestCallbackMap[requestId]) {
                            this.requestCallbackMap[requestId](message);
                        }
                    }
                });

                this.ws.addEventListener('close', () => {
                    console.log('Disconnected from server');
                });

                this.ws.addEventListener('error', (error) => {
                    console.error('WebSocket Error:', error);
                });
            }
            else {
                if (this.ws.readyState === WebSocket.OPEN) {
                    resolve(this.ws);
                }
                else {
                    this.ws.addEventListener('open', openListener);
                }
            }
        });
    }
    async fetchWebSocketEvents(...requests: any) {
        let requestId;
        do {
            requestId = this.generateRandomNumber();
        } while (this.requestCallbackMap[requestId]);
        return new Promise<INostrEvent[]>(async (resolve, reject) => {
            let events: INostrEvent[] = [];
            const ws = await this.establishConnection(requestId, (message) => {
                if (message[0] === "EVENT") {
                    const eventData = message[2];
                    // Implement the verifySignature function according to your needs
                    // console.log(verifySignature(eventData)); // true
                    events.push(eventData);
                } else if (message[0] === "EOSE") {
                    resolve(events);
                    console.log("end of stored events");
                }
            });
            ws.send(JSON.stringify(["REQ", requestId, ...requests]));
        });
    }
    async submitEvent(event: Event.EventTemplate<number>, privateKey: string) {
        let requestId;
        do {
            requestId = this.generateRandomNumber();
        } while (this.requestCallbackMap[requestId]);
        const ws = await this.establishConnection(requestId, (message) => {
            console.log('from server:', message);
        });
        event = Event.finishEvent(event, privateKey)
        let msg = JSON.stringify(["EVENT", event]);
        console.log(msg);
        ws.send(msg);
    }
}

class NostrCachedWebSocketManager extends NostrWebSocketManager {
    async fetchCachedEvents(eventType: string, msg: any) {
        let requestId;
        do {
            requestId = eventType + '_' + this.generateRandomNumber();
        } while (this.requestCallbackMap[requestId]);
        return new Promise<INostrEvent[]>(async (resolve, reject) => {
            let events: INostrEvent[] = [];
            const ws = await this.establishConnection(requestId, (message) => {
                // console.log('from server:', message);
                if (message[0] === "EVENT") {
                    const eventData = message[2];
                    // Implement the verifySignature function according to your needs
                    // console.log(verifySignature(eventData)); // true
                    events.push(eventData);
                } else if (message[0] === "EOSE") {
                    resolve(events);
                    console.log("end of stored events");
                }
            });

            ws.send(JSON.stringify(["REQ", requestId, {
                cache: [
                    eventType,
                    msg
                ]
            }]));
        });
    }
}

class NostrEventManager {
    private _relays: string[];
    private _cachedServer: string;
    private _websocketManager: NostrWebSocketManager;
    private _cachedWebsocketManager: NostrCachedWebSocketManager;

    constructor(relays: string[], cachedServer: string) {
        this._relays = relays;
        this._cachedServer = cachedServer;
        this._websocketManager = new NostrWebSocketManager(this._relays[0]);
        this._cachedWebsocketManager = new NostrCachedWebSocketManager(this._cachedServer);
    }

    async fetchThreadCacheEvents(id: string, pubKey?: string) {
        let decodedId = id.startsWith('note1') ? Nip19.decode(id).data : id;
        let msg: any = {
            event_id: decodedId,
            limit: 100
        };
        if (pubKey) {
            const decodedPubKey = pubKey.startsWith('npub1') ? Nip19.decode(pubKey).data : pubKey;
            msg.user_pubkey = decodedPubKey;
        }
        const events = await this._cachedWebsocketManager.fetchCachedEvents('thread_view', msg);
        return events;
    }

    async fetchTrendingCacheEvents(pubKey?: string) {
        let msg: any = {
        };
        if (pubKey) {
            const decodedPubKey = pubKey.startsWith('npub1') ? Nip19.decode(pubKey).data : pubKey;
            msg.user_pubkey = decodedPubKey;
        }
        const events = await this._cachedWebsocketManager.fetchCachedEvents('explore_global_trending_24h', msg);
        return events;
    }

    async fetchProfileFeedCacheEvents(pubKey: string) {
        const decodedPubKey = pubKey.startsWith('npub1') ? Nip19.decode(pubKey).data : pubKey;
        let msg: any = {
            limit: 20,
            notes: "authored",
            pubkey: decodedPubKey,
            since: 0,
            user_pubkey: decodedPubKey
        };
        const events = await this._cachedWebsocketManager.fetchCachedEvents('feed', msg);
        return events;
    }

    async fetchHomeFeedCacheEvents(pubKey?: string) {
        let msg: any = {
            limit: 20,
        };
        if (pubKey) {
            const decodedPubKey = pubKey.startsWith('npub1') ? Nip19.decode(pubKey).data : pubKey;
            msg.pubkey = decodedPubKey;
            msg.user_pubkey = decodedPubKey;
            msg.since = 0;
        }
        else {
            msg.since = 0;
            msg.pubkey = Nip19.decode('npub1nfgqmnxqsjsnsvc2r5djhcx4ap3egcjryhf9ppxnajskfel2dx9qq6mnsp').data //FIXME: Account to show Nostr highlights 
        }
        const events = await this._cachedWebsocketManager.fetchCachedEvents('feed', msg);
        return events;
    }

    async fetchUserProfileCacheEvents(pubKeys: string[]) {
        const decodedPubKeys = pubKeys.map(pubKey => pubKey.startsWith('npub1') ? Nip19.decode(pubKey).data : pubKey);
        let msg: any = {
            pubkeys: decodedPubKeys
        };
        const events = await this._cachedWebsocketManager.fetchCachedEvents('user_infos', msg);
        return events;
    }

    async fetchUserProfileDetailCacheEvents(pubKey: string) {
        const decodedPubKey = pubKey.startsWith('npub1') ? Nip19.decode(pubKey).data : pubKey;
        let msg: any = {
            pubkey: decodedPubKey,
            user_pubkey: decodedPubKey
        };
        const events = await this._cachedWebsocketManager.fetchCachedEvents('user_profile', msg);
        return events;
    }

    async fetchContactListCacheEvents(pubKey: string) {
        const decodedPubKey = pubKey.startsWith('npub1') ? Nip19.decode(pubKey).data : pubKey;
        let msg: any = {
            extended_response: true,
            pubkey: decodedPubKey
        };
        const events = await this._cachedWebsocketManager.fetchCachedEvents('contact_list', msg);
        return events;
    }    

    async fetchFollowersCacheEvents(pubKey: string) {
        const decodedPubKey = pubKey.startsWith('npub1') ? Nip19.decode(pubKey).data : pubKey;
        let msg: any = {
            pubkey: decodedPubKey
        };
        const events = await this._cachedWebsocketManager.fetchCachedEvents('user_followers', msg);
        return events;
    }  

    async fetchRelaysCacheEvents(pubKey: string) {
        const decodedPubKey = pubKey.startsWith('npub1') ? Nip19.decode(pubKey).data : pubKey;
        let msg: any = {
            extended_response: false,
            pubkey: decodedPubKey
        };
        const events = await this._cachedWebsocketManager.fetchCachedEvents('contact_list', msg);
        return events;
    }   

    async fetchCommunities(pubkeyToCommunityIdsMap?: Record<string, string[]>) {
        let events;
        if (pubkeyToCommunityIdsMap && Object.keys(pubkeyToCommunityIdsMap).length > 0) {
            let requests: any[] = [];
            for (let pubkey in pubkeyToCommunityIdsMap) {
                const decodedPubKey = pubkey.startsWith('npub1') ? Nip19.decode(pubkey).data : pubkey;
                const communityIds = pubkeyToCommunityIdsMap[pubkey];
                let request: any = {
                    kinds: [34550],
                    authors: [decodedPubKey],
                    "#d": communityIds
                };
                requests.push(request);
            }
            events = await this._websocketManager.fetchWebSocketEvents(...requests);
        }
        else {
            let request: any = {
                kinds: [34550],
                limit: 50
            };
            events = await this._websocketManager.fetchWebSocketEvents(request);
        }
        return events;
    }

    async fetchUserCommunities(pubKey: string) {
        const decodedPubKey = pubKey.startsWith('npub1') ? Nip19.decode(pubKey).data : pubKey;
        let requestForCreatedOrFollowedCommunities: any = {
            kinds: [0, 3, 34550, 30001],
            authors: [decodedPubKey]
        };
        let requestForModeratedCommunities: any = {
            kinds: [34550],
            "#p": [decodedPubKey]
        };
        const events = await this._websocketManager.fetchWebSocketEvents(
            requestForCreatedOrFollowedCommunities, 
            requestForModeratedCommunities
        );
        return events;
    }

    async fetchUserSubscribedCommunities(pubKey: string) {
        const decodedPubKey = pubKey.startsWith('npub1') ? Nip19.decode(pubKey).data : pubKey;
        let request: any = {
            kinds: [30001],
            authors: [decodedPubKey]
        };
        const events = await this._websocketManager.fetchWebSocketEvents(request);
        return events;
    }

    async fetchCommunity(creatorId: string, communityId: string) {
        const decodedCreatorId = creatorId.startsWith('npub1') ? Nip19.decode(creatorId).data : creatorId;
        let infoMsg: any = {
            kinds: [34550],
            authors: [decodedCreatorId],
            "#d": [communityId]
        };
        const events = await this._websocketManager.fetchWebSocketEvents(infoMsg);
        return events;        
    }

    async fetchCommunityFeed(creatorId: string, communityId: string) {
        const decodedCreatorId = creatorId.startsWith('npub1') ? Nip19.decode(creatorId).data : creatorId;
        let infoMsg: any = {
            kinds: [34550],
            authors: [decodedCreatorId],
            "#d": [communityId]
        };
        let notesMsg: any = {
            kinds: [1, 7, 9735],
            "#a": [`34550:${decodedCreatorId}:${communityId}`],
            limit: 50
        };
        const events = await this._websocketManager.fetchWebSocketEvents(infoMsg, notesMsg);
        return events;        
    }

    async fetchCommunitiesGeneralMembers(communities: ICommunityBasicInfo[]) {
        const communityUriArr: string[] = [];
        for (let community of communities) {
            const decodedCreatorId = community.creatorId.startsWith('npub1') ? Nip19.decode(community.creatorId).data : community.creatorId;
            communityUriArr.push(`34550:${decodedCreatorId}:${community.communityId}`);
        }
        let request: any = {
            kinds: [30001],
            "#d": ["communities"],
            "#a": communityUriArr
        };
        const events = await this._websocketManager.fetchWebSocketEvents(request);
        return events;        
    }

    async fetchNotes(options: IFetchNotesOptions) {
        const decodedNpubs = options.authors?.map(npub => Nip19.decode(npub).data);
        let decodedIds = options.ids?.map(id => id.startsWith('note1') ? Nip19.decode(id).data : id);
        let msg: any = {
            kinds: [1],
            limit: 20
        };
        if (decodedNpubs) msg.authors = decodedNpubs;
        if (decodedIds) msg.ids = decodedIds;
        const events = await this._websocketManager.fetchWebSocketEvents(msg);
        return events;
    }

    async fetchMetadata(options: IFetchMetadataOptions) {
        let decodedNpubs;
        if (options.decodedAuthors) {
            decodedNpubs = options.decodedAuthors;
        }
        else {
            decodedNpubs = options.authors?.map(npub => Nip19.decode(npub).data) || [];
        }
        const msg = {
            authors: decodedNpubs,
            kinds: [0]
        };
        const events = await this._websocketManager.fetchWebSocketEvents(msg);
        return events;
    }

    async fetchReplies(options: IFetchRepliesOptions) {
        let decodedNoteIds;
        if (options.decodedIds) {
            decodedNoteIds = options.decodedIds;
        }
        else {
            decodedNoteIds = options.noteIds?.map(id => id.startsWith('note1') ? Nip19.decode(id).data : id);
        }
        const msg = {
            "#e": decodedNoteIds,
            kinds: [1],
            limit: 20,
        }
        const events = await this._websocketManager.fetchWebSocketEvents(msg);
        return events;
    }

    async fetchFollowing(npubs: string[]) {
        const decodedNpubs = npubs.map(npub => Nip19.decode(npub).data);
        const msg = {
            authors: decodedNpubs,
            kinds: [3]
        }
        const events = await this._websocketManager.fetchWebSocketEvents(msg);
        return events;
    }

    async postNote(content: string, privateKey: string, conversationPath?: IConversationPath) {
        let event = {
            "kind": 1,
            "created_at": Math.round(Date.now() / 1000),
            "content": content,
            "tags": []
        };
        if (conversationPath) {
            const conversationPathTags = this.calculateConversationPathTags(conversationPath);
            event.tags = conversationPathTags;
        }
        console.log('postNote', event);
        await this._websocketManager.submitEvent(event, privateKey);
    }

    calculateConversationPathTags(conversationPath: IConversationPath) {
        let tags: string[][] = [];
        for (let i = 0; i < conversationPath.noteIds.length; i++) {
            const noteId = conversationPath.noteIds[i];
            const decodedNoteId = noteId.startsWith('note1') ? Nip19.decode(noteId).data as string : noteId;
            let tagItem;
            if (i === 0) {
                tagItem = [
                    "e", 
                    decodedNoteId,
                    "",
                    "root"
                ];
            }
            else if (i === conversationPath.noteIds.length - 1) {
                tagItem = [
                    "e", 
                    decodedNoteId,
                    "",
                    "reply"
                ];
            } 
            else {
                tagItem = [
                    "e", 
                    decodedNoteId
                ];          
            }
            tags.push(tagItem);
        }
        for (let authorId of conversationPath.authorIds) {
            const decodedAuthorId = authorId.startsWith('npub1') ? Nip19.decode(authorId).data as string : authorId;
            tags.push([
                "p",
                decodedAuthorId
            ]);
        }
        return tags;
    }

    async updateCommunity(info: ICommunityInfo, privateKey: string) {
        let event = {
            "kind": 34550,
            "created_at": Math.round(Date.now() / 1000),
            "content": '',
            "tags": [
                [
                    "d",
                    info.communityId
                ],
                [
                    "description",
                    info.description
                ]
            ]
        };
        if (info.bannerImgUrl) {
            event.tags.push([
                "image",
                info.bannerImgUrl
            ]);
        }
        if (info.rules) {
            event.tags.push([
                "rules",
                info.rules
            ]);
        }
        if (info.scpData) {
            let encodedScpData = window.btoa('$scp:' + JSON.stringify(info.scpData));
            event.tags.push([
                "scp",
                "1",
                encodedScpData
            ]);
        }
        for (let moderatorId of info.moderatorIds) {
            const decodedModeratorId = moderatorId.startsWith('npub1') ? Nip19.decode(moderatorId).data as string : moderatorId;
            event.tags.push([
                "p",
                decodedModeratorId,
                "",
                "moderator"
            ]);
        }
        await this._websocketManager.submitEvent(event, privateKey);
    }

    async updateUserCommunities(communities: ICommunityBasicInfo[], privateKey: string) {
        let communityUriArr: string[] = [];
        for (let community of communities) {
            const decodedCreatorId = community.creatorId.startsWith('npub1') ? Nip19.decode(community.creatorId).data as string : community.creatorId;
            communityUriArr.push(`34550:${decodedCreatorId}:${community.communityId}`);
        }
        let event = {
            "kind": 30001,
            "created_at": Math.round(Date.now() / 1000),
            "content": '',
            "tags": [
                [
                    "d",
                    "communities"
                ]
            ]
        };
        for (let communityUri of communityUriArr) {
            event.tags.push([
                "a",
                communityUri
            ]);
        }
        await this._websocketManager.submitEvent(event, privateKey);
    }

    async submitCommunityPost(info: INewCommunityPostInfo, privateKey: string) {
        const community = info.community;
        const decodedCreatorId = community.creatorId.startsWith('npub1') ? Nip19.decode(community.creatorId).data as string : community.creatorId;
        const communityUri = `34550:${decodedCreatorId}:${community.communityId}`;
        let event = {
            "kind": 1,
            "created_at": Math.round(Date.now() / 1000),
            "content": info.message,
            "tags": []
        };
        if (info.scpData) {
            let encodedScpData = window.btoa('$scp:' + JSON.stringify(info.scpData));
            event.tags.push([
                "scp",
                "2",
                encodedScpData
            ]);
        }
        if (info.conversationPath) {
            const conversationPathTags = this.calculateConversationPathTags(info.conversationPath);
            event.tags.push(...conversationPathTags);
        }
        else {
            event.tags.push([
                "a",
                communityUri,
                "",
                "root"
            ]);
        }
        console.log('submitCommunityPost', event);
        await this._websocketManager.submitEvent(event, privateKey);
    }

    async updateUserProfile(content: INostrMetadataContent, privateKey: string) {
        let event = {
            "kind": 0,
            "created_at": Math.round(Date.now() / 1000),
            "content": JSON.stringify(content),
            "tags": []
        };
        await this._websocketManager.submitEvent(event, privateKey);
    }

    async fetchMessageCountsCacheEvents(pubKey: string) {
        const decodedPubKey = pubKey.startsWith('npub1') ? Nip19.decode(pubKey).data : pubKey;
        let msg: any = {
            user_pubkey: decodedPubKey,
            relation: 'follows'
        };
        const followsEvents = await this._cachedWebsocketManager.fetchCachedEvents('get_directmsg_contacts', msg);
        msg = {
            user_pubkey: decodedPubKey,
            relation: 'other'
        };
        const otherEvents = await this._cachedWebsocketManager.fetchCachedEvents('get_directmsg_contacts', msg);
        return [...followsEvents, ...otherEvents];
    }

    async fetchOldMessages(pubKey: string, sender: string, until: number = 0) {
        const decodedPubKey = pubKey.startsWith('npub1') ? Nip19.decode(pubKey).data : pubKey;
        const decodedSenderPubKey = sender.startsWith('npub1') ? Nip19.decode(sender).data : sender;
        const start = until === 0 ? 'since' : 'until';
        const msg: any = {
            receiver: decodedPubKey,
            sender: decodedSenderPubKey,
            limit: 20,
            [start]: until
        }
        const events = await this._cachedWebsocketManager.fetchCachedEvents('get_directmsgs', msg);
        return events;
    }

    async fetchNewMessages(pubKey: string, sender: string, since: number = 0) {
        const decodedPubKey = pubKey.startsWith('npub1') ? Nip19.decode(pubKey).data : pubKey;
        const decodedSenderPubKey = sender.startsWith('npub1') ? Nip19.decode(sender).data : sender;
        const msg: any = {
            receiver: decodedPubKey,
            sender: decodedSenderPubKey,
            limit: 20,
            since: since
        }
        const events = await this._cachedWebsocketManager.fetchCachedEvents('get_directmsgs', msg);
        return events;
    }

    async sendMessage(receiver: string, encryptedMessage: string, privateKey: string) {
        const decodedPubKey = receiver.startsWith('npub1') ? Nip19.decode(receiver).data : receiver;
        let event = {
            "kind": 4,
            "created_at": Math.round(Date.now() / 1000),
            "content": encryptedMessage,
            "tags": [
                [
                    'p',
                    decodedPubKey as string
                ]
            ]
        }
        await this._websocketManager.submitEvent(event, privateKey);
    }

    async resetMessageCount(pubKey: string, sender: string, privateKey: string) {
        const decodedPubKey = pubKey.startsWith('npub1') ? Nip19.decode(pubKey).data as string : pubKey;
        const decodedSenderPubKey = sender.startsWith('npub1') ? Nip19.decode(sender).data : sender;
        const createAt = Math.ceil(Date.now() / 1000);
        let event: any = {
            "content": JSON.stringify({ "description": `reset messages from '${decodedSenderPubKey}'`}),
            "kind": 30078,
            "tags": [
                [
                    "d",
                    "Scom Social"
                ]
            ],
            "created_at": createAt,
            "pubkey": decodedPubKey
        };
        event.id = Event.getEventHash(event);
        event.sig = Event.getSignature(event, privateKey);
        const msg: any = {
            event_from_user: event,
            sender: decodedSenderPubKey
        };
        await this._cachedWebsocketManager.fetchCachedEvents('reset_directmsg_count', msg);
    }

}

interface ISocialEventManager {
    fetchThreadCacheEvents(id: string, pubKey?: string): Promise<INostrEvent[]>;
    fetchTrendingCacheEvents(pubKey?: string): Promise<INostrEvent[]>;
    fetchProfileFeedCacheEvents(pubKey: string): Promise<INostrEvent[]>;
    fetchHomeFeedCacheEvents(pubKey?: string): Promise<INostrEvent[]>;
    fetchUserProfileCacheEvents(pubKeys: string[]): Promise<INostrEvent[]>;
    fetchUserProfileDetailCacheEvents(pubKey: string): Promise<INostrEvent[]>;
    fetchContactListCacheEvents(pubKey: string): Promise<INostrEvent[]>;
    fetchFollowersCacheEvents(pubKey: string): Promise<INostrEvent[]>;
    fetchRelaysCacheEvents(pubKey: string): Promise<INostrEvent[]>;
    fetchCommunities(pubkeyToCommunityIdsMap?: Record<string, string[]>): Promise<INostrEvent[]>;
    fetchUserCommunities(pubKey: string): Promise<INostrEvent[]>;
    fetchUserSubscribedCommunities(pubKey: string): Promise<INostrEvent[]>;
    fetchCommunity(creatorId: string, communityId: string): Promise<INostrEvent[]>;
    fetchCommunityFeed(creatorId: string, communityId: string): Promise<INostrEvent[]>;
    fetchCommunitiesGeneralMembers(communities: ICommunityBasicInfo[]): Promise<INostrEvent[]>;
    fetchNotes(options: IFetchNotesOptions): Promise<INostrEvent[]>;
    fetchMetadata(options: IFetchMetadataOptions): Promise<INostrEvent[]>;
    fetchReplies(options: IFetchRepliesOptions): Promise<INostrEvent[]>;
    fetchFollowing(npubs: string[]): Promise<INostrEvent[]>;
    postNote(content: string, privateKey: string, conversationPath?: IConversationPath): Promise<void>;
    updateCommunity(info: ICommunityInfo, privateKey: string): Promise<void>;
    updateUserCommunities(communities: ICommunityBasicInfo[], privateKey: string): Promise<void>;
    submitCommunityPost(info: INewCommunityPostInfo, privateKey: string): Promise<void>;
    updateUserProfile(content: INostrMetadataContent, privateKey: string): Promise<void>;
    fetchMessageCountsCacheEvents(pubKey: string): Promise<INostrEvent[]>;
    fetchOldMessages(pubKey: string, sender: string, until?: number): Promise<INostrEvent[]>;
    fetchNewMessages(pubKey: string, sender: string, since?: number): Promise<INostrEvent[]>;
    sendMessage(receiver: string, encryptedMessage: string, privateKey: string): Promise<void>;
    resetMessageCount(pubKey: string, sender: string, privateKey: string): Promise<void>;
}

class SocialDataManager {
    private _socialEventManager: ISocialEventManager;

    constructor(relays: string[], cachedServer: string) {
        this._socialEventManager = new NostrEventManager(relays, cachedServer);
    }

    get socialEventManager() {
        return this._socialEventManager;
    }

    hexStringToUint8Array(hexString: string): Uint8Array {
        return new Uint8Array(hexString.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
    }

    base64ToUtf8(base64: string): string {
        if (typeof window !== "undefined"){
            return atob(base64);
        }
        else {
            // @ts-ignore
            return Buffer.from(base64, 'base64').toString('utf8');
        }
    }

    async encryptMessage(ourPrivateKey: string, theirPublicKey: string, text: string): Promise<string> {
        const sharedSecret = Keys.getSharedSecret(ourPrivateKey, '02' + theirPublicKey);
        const sharedX = this.hexStringToUint8Array(sharedSecret.slice(2));
        
        let encryptedMessage;
        let ivBase64;
        if (typeof window !== "undefined"){
            const iv = crypto.getRandomValues(new Uint8Array(16));
            const key = await crypto.subtle.importKey('raw', sharedX, { name: 'AES-CBC' }, false, ['encrypt']);
            const encryptedBuffer = await crypto.subtle.encrypt({ name: 'AES-CBC', iv }, key, new TextEncoder().encode(text));
            encryptedMessage = btoa(String.fromCharCode(...new Uint8Array(encryptedBuffer)));
            ivBase64 = btoa(String.fromCharCode(...iv));
        }
        else {
            // @ts-ignore
            const crypto = require('crypto');
            const iv = crypto.randomBytes(16);
            const cipher = crypto.createCipheriv('aes-256-cbc', sharedX, iv);
            encryptedMessage = cipher.update(text, 'utf8', 'base64');
            encryptedMessage += cipher.final('base64');
            ivBase64 = iv.toString('base64');
        }
        return `${encryptedMessage}?iv=${ivBase64}`;
    }

    async decryptMessage(ourPrivateKey: string, theirPublicKey: string, encryptedData: string): Promise<string> {
        let decryptedMessage = null;
        try {
            const [encryptedMessage, ivBase64] = encryptedData.split('?iv=');
            
            const sharedSecret = Keys.getSharedSecret(ourPrivateKey, '02' + theirPublicKey);
            const sharedX = this.hexStringToUint8Array(sharedSecret.slice(2)); 
            if (typeof window !== "undefined"){
                const iv = Uint8Array.from(atob(ivBase64), c => c.charCodeAt(0));
                const key = await crypto.subtle.importKey('raw', sharedX, { name: 'AES-CBC' }, false, ['decrypt']);
                const decryptedBuffer = await crypto.subtle.decrypt({ name: 'AES-CBC', iv }, key, Uint8Array.from(atob(encryptedMessage), c => c.charCodeAt(0)));
                decryptedMessage = new TextDecoder().decode(decryptedBuffer);
            }
            else {
                // @ts-ignore
                const crypto = require('crypto');
                // @ts-ignore
                const iv = Buffer.from(ivBase64, 'base64');
                const decipher = crypto.createDecipheriv('aes-256-cbc', sharedX, iv);
                // @ts-ignore
                let decrypted = decipher.update(Buffer.from(encryptedMessage, 'base64'));
                // @ts-ignore
                decrypted = Buffer.concat([decrypted, decipher.final()]);
                decryptedMessage = decrypted.toString('utf8');
            }
        }
        catch (e) {
        }
        return decryptedMessage;
    }

    extractCommunityInfo(event: INostrEvent) {
        const communityId = event.tags.find(tag => tag[0] === 'd')?.[1];
        const description = event.tags.find(tag => tag[0] === 'description')?.[1];
        const image = event.tags.find(tag => tag[0] === 'image')?.[1];
        const creatorId = Nip19.npubEncode(event.pubkey);
        const moderatorIds = event.tags.filter(tag => tag[0] === 'p' && tag?.[3] === 'moderator').map(tag => Nip19.npubEncode(tag[1]));
        const scpTag = event.tags.find(tag => tag[0] === 'scp');
        let scpData;
        let gatekeeperNpub;
        if (scpTag && scpTag[1] === '1') {
            const scpDataStr = this.base64ToUtf8(scpTag[2]);
            if (!scpDataStr.startsWith('$scp:')) return null;
            scpData = JSON.parse(scpDataStr.substring(5));
            if (scpData.gatekeeperPublicKey) {
                gatekeeperNpub = Nip19.npubEncode(scpData.gatekeeperPublicKey);
            }
        }
        const communityUri = `34550:${event.pubkey}:${communityId}`;
        
        let communityInfo: ICommunityInfo = {
            creatorId,
            moderatorIds,
            communityUri,
            communityId,
            description,
            bannerImgUrl: image,
            scpData,
            eventData: event,
            gatekeeperNpub
        }

        return communityInfo;
    }

    async retrieveCommunityEvents(creatorId: string, communityId: string) {
        const feedEvents = await this._socialEventManager.fetchCommunityFeed(creatorId, communityId);
        const notes = feedEvents.filter(event => event.kind === 1);
        const communityEvent = feedEvents.find(event => event.kind === 34550);
        if (!communityEvent) throw new Error('No info event found');
        const communityInfo = this.extractCommunityInfo(communityEvent);
        if (!communityInfo) throw new Error('No info event found');

        return {
            notes,
            info: communityInfo
        }
    }

    retrieveCommunityUri(noteEvent: INostrEvent, scpData: any) {
        let communityUri: string | null = null;
        if (scpData?.communityUri) {
            communityUri = scpData.communityUri;    
        }
        else {
            const replaceableTag = noteEvent.tags.find(tag => tag[0] === 'a');
            if (replaceableTag) {
                const replaceableTagArr = replaceableTag[1].split(':');
                if (replaceableTagArr[0] === '34550') {
                    communityUri = replaceableTag[1];
                }
            }
        }
        return communityUri;
    }

    extractPostScpData(noteEvent: INostrEvent) {
        const scpTag = noteEvent.tags.find(tag => tag[0] === 'scp');
        let scpData;
        if (scpTag && scpTag[1] === '2') {
            const scpDataStr = this.base64ToUtf8(scpTag[2]);
            if (!scpDataStr.startsWith('$scp:')) return null;
            scpData = JSON.parse(scpDataStr.substring(5));
        }
        return scpData;
    }

    async retrievePostPrivateKey(noteEvent: INostrEvent, communityUri: string, communityPrivateKey: string) {
        let key: string | null = null;
        let postScpData = this.extractPostScpData(noteEvent);
        try {
            const postPrivateKey = await this.decryptMessage(communityPrivateKey, noteEvent.pubkey, postScpData.encryptedKey);
            const messageContentStr = await this.decryptMessage(postPrivateKey, noteEvent.pubkey, noteEvent.content);
            const messageContent = JSON.parse(messageContentStr);
            if (communityUri === messageContent.communityUri) {
                key = postPrivateKey;
            }
        } 
        catch (e) {
            // console.error(e);
        }
        return key;
    }

    async retrieveCommunityPostKeys(options: IRetrieveCommunityPostKeysOptions) {
        let noteIdToPrivateKey: Record<string, string> = {};
        if (options.gatekeeperUrl) {
            let bodyData = {
                creatorId: options.creatorId,
                communityId: options.communityId,
                message: options.message,
                signature: options.signature
            };
            let url = `${options.gatekeeperUrl}/api/communities/v0/post-keys`;
            let response = await fetch(url, {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(bodyData)
            });
            let result = await response.json();
            if (result.success) {
                noteIdToPrivateKey = result.data;
            }
        }
        else if (options.privateKey) {
            const communityEvents = await this.retrieveCommunityEvents(options.creatorId, options.communityId);
            const communityInfo = communityEvents.info;
            const notes = communityEvents.notes;    
            let communityPrivateKey = await this.decryptMessage(options.privateKey, communityInfo.scpData.gatekeeperPublicKey, communityInfo.scpData.encryptedKey);
            if (!communityPrivateKey) return noteIdToPrivateKey;
            for (const note of notes) {
                const postPrivateKey = await this.retrievePostPrivateKey(note, communityInfo.communityUri, communityPrivateKey);
                if (postPrivateKey) {
                    noteIdToPrivateKey[note.id] = postPrivateKey;
                }
            }
        }
        return noteIdToPrivateKey;
    }

    async retrieveCommunityThreadPostKeys(options: IRetrieveCommunityThreadPostKeysOptions) {
        const communityInfo = options.communityInfo;
        let noteIdToPrivateKey: Record<string, string> = {};
        if (options.gatekeeperUrl) {
            let bodyData = {
                creatorId: communityInfo.creatorId,
                communityId: communityInfo.communityId,
                focusedNoteId: options.focusedNoteId,
                message: options.message,
                signature: options.signature
            };
            let url = `${options.gatekeeperUrl}/api/communities/v0/post-keys`;
            let response = await fetch(url, {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(bodyData)
            });
            let result = await response.json();
            if (result.success) {
                noteIdToPrivateKey = result.data;
            }
        }
        else if (options.privateKey) {
            let communityPrivateKey = await this.decryptMessage(options.privateKey, communityInfo.scpData.gatekeeperPublicKey, communityInfo.scpData.encryptedKey);
            if (!communityPrivateKey) return noteIdToPrivateKey;
            for (const note of options.noteEvents) {
                const postPrivateKey = await this.retrievePostPrivateKey(note, communityInfo.communityUri, communityPrivateKey);
                if (postPrivateKey) {
                    noteIdToPrivateKey[note.id] = postPrivateKey;
                }
            }
        }
        return noteIdToPrivateKey;
    }

    async retrieveCommunityPostKeysByNoteEvents(options: IRetrieveCommunityPostKeysByNoteEventsOptions) {
        let noteIdToPrivateKey: Record<string, string> = {};
        let communityPrivateKeyMap: Record<string, string> = {};
        const noteCommunityMappings = await this.createNoteCommunityMappings(options.notes);
        if (noteCommunityMappings.noteCommunityInfoList.length === 0) return noteIdToPrivateKey;
        const communityInfoMap: Record<string, ICommunityInfo> = {};
        for (let communityInfo of noteCommunityMappings.communityInfoList) {
            if (options.pubKey === communityInfo.creatorId) {
                let communityPrivateKey = await this.decryptMessage(options.privateKey, communityInfo.scpData.gatekeeperPublicKey, communityInfo.scpData.encryptedKey);
                if (communityPrivateKey) {
                    communityPrivateKeyMap[communityInfo.communityUri] = communityPrivateKey;
                }
            }
            communityInfoMap[communityInfo.communityUri] = communityInfo;
        }  
        let gatekeeperNpubToNotesMap: Record<string, INoteCommunityInfo[]> = {};
        for (let noteCommunityInfo of noteCommunityMappings.noteCommunityInfoList) {
            const communityPrivateKey = communityPrivateKeyMap[noteCommunityInfo.communityUri];
            if (communityPrivateKey)  {
                const postPrivateKey = await this.retrievePostPrivateKey(noteCommunityInfo.eventData, noteCommunityInfo.communityUri, communityPrivateKey);
                if (postPrivateKey) {
                    noteIdToPrivateKey[noteCommunityInfo.eventData.id] = postPrivateKey;
                }
            }
            else {
                const communityInfo = communityInfoMap[noteCommunityInfo.communityUri];
                gatekeeperNpubToNotesMap[communityInfo.gatekeeperNpub] = gatekeeperNpubToNotesMap[communityInfo.gatekeeperNpub] || [];
                gatekeeperNpubToNotesMap[communityInfo.gatekeeperNpub].push(noteCommunityInfo);
            }
        }
        if (Object.keys(gatekeeperNpubToNotesMap).length > 0) {
            for (let gatekeeperNpub in gatekeeperNpubToNotesMap) {
                const gatekeeperUrl = options.gatekeepers.find(v => v.npub === gatekeeperNpub)?.url;
                if (gatekeeperUrl) {
                    const noteIds = gatekeeperNpubToNotesMap[gatekeeperNpub].map(v => v.eventData.id);
                    const signature = await options.getSignature(options.pubKey);
                    let bodyData = {
                        noteIds: noteIds.join(','),
                        message: options.pubKey,
                        signature: signature
                    };
                    let url = `${gatekeeperUrl}/api/communities/v0/post-keys`;
                    let response = await fetch(url, {
                        method: 'POST',
                        headers: {
                            Accept: 'application/json',
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(bodyData)
                    });
                    let result = await response.json();
                    if (result.success) {
                        noteIdToPrivateKey = {
                            ...noteIdToPrivateKey,
                            ...result.data
                        };
                    }
                }
            }
        }
        return noteIdToPrivateKey;
    }

    async constructMetadataByPubKeyMap(notes: INostrEvent[]) {
        let mentionAuthorSet = new Set();
        for (let i = 0; i < notes.length; i++) {
            const mentionTags = notes[i].tags.filter(tag => tag[0] === 'p' && tag[1] !== notes[i].pubkey)?.map(tag => tag[1]) || [];
            if (mentionTags.length) {
                mentionTags.forEach(tag => mentionAuthorSet.add(tag));
            }
        }
        const uniqueKeys = Array.from(mentionAuthorSet) as string[];
        const npubs = notes.map(note => note.pubkey).filter((value, index, self) => self.indexOf(value) === index);
        const metadata = await this._socialEventManager.fetchMetadata({
            decodedAuthors: [...npubs, ...uniqueKeys]
        });
    
        const metadataByPubKeyMap: Record<string, INostrMetadata> = metadata.reduce((acc, cur) => {
            const content = JSON.parse(cur.content);
            acc[cur.pubkey] = {
                ...cur,
                content
            };
            return acc;
        }, {});
        return metadataByPubKeyMap;
    }

    async fetchThreadNotesInfo(focusedNoteId: string, fetchFromCache: boolean = true) {
        let focusedNote: INostrEvent;
        let ancestorNotes: INostrEvent[] = [];
        let replies: INostrEvent[] = [];
        let metadataByPubKeyMap: Record<string, INostrMetadata> = {};
        let childReplyEventTagIds: string[] = [];
        let quotedNotesMap: Record<string, INostrEvent> = {};
        let relevantNotes: INostrEvent[] = [];
        //Ancestor posts -> Focused post -> Child replies
        let decodedFocusedNoteId = focusedNoteId.startsWith('note1') ? Nip19.decode(focusedNoteId).data as string : focusedNoteId;
        if (fetchFromCache) {
            const threadEvents = await this._socialEventManager.fetchThreadCacheEvents(decodedFocusedNoteId);
    
            for (let threadEvent of threadEvents) {
                if (threadEvent.kind === 0) {
                    metadataByPubKeyMap[threadEvent.pubkey] = {
                        ...threadEvent,
                        content: JSON.parse(threadEvent.content)
                    };
                }
                else if (threadEvent.kind === 1) {
                    if (threadEvent.id === decodedFocusedNoteId) {
                        focusedNote = threadEvent;
                    }
                    else if (threadEvent.tags.some(tag => tag[0] === 'e' && tag[1] === decodedFocusedNoteId)) {
                        replies.push(threadEvent);
                    }
                    else {
                        ancestorNotes.push(threadEvent);
                    }
                }
                else if (threadEvent.kind === 10000107) {
                    const note = JSON.parse(threadEvent.content) as INostrEvent;
                    quotedNotesMap[note.id] = note;
                } 
            }
            relevantNotes = [
                ...ancestorNotes,
                focusedNote,
                ...replies
            ];
        }
        else {
            const focusedNotes = await this._socialEventManager.fetchNotes({
                ids: [focusedNoteId]
            });
            if (focusedNotes.length === 0) return null;
            focusedNote = focusedNotes[0];
            const ancestorDecodedIds = focusedNote.tags.filter(tag => tag[0] === 'e')?.map(tag => tag[1]) || [];
            if (ancestorDecodedIds.length > 0) {
                ancestorNotes = await this._socialEventManager.fetchNotes({
                    ids: ancestorDecodedIds
                });
            }
            childReplyEventTagIds = [...ancestorDecodedIds, decodedFocusedNoteId];
            replies = await this._socialEventManager.fetchReplies({
                decodedIds: childReplyEventTagIds
            });
            relevantNotes = [
                ...ancestorNotes,
                focusedNote,
                ...replies
            ]
            metadataByPubKeyMap = await this.constructMetadataByPubKeyMap(relevantNotes);
        }
        let communityInfo: ICommunityInfo | null = null;
        let scpData = this.extractPostScpData(focusedNote);
        if (scpData) {
            const communityUri = this.retrieveCommunityUri(focusedNote, scpData);
            if (communityUri) {
                const creatorId = communityUri.split(':')[1];
                const communityId = communityUri.split(':')[2];
                const communityEvents = await this._socialEventManager.fetchCommunity(creatorId, communityId);
                const communityEvent = communityEvents.find(event => event.kind === 34550);
                if(!communityEvent) throw new Error('No info event found');
                communityInfo = this.extractCommunityInfo(communityEvent);
            }
        }
        return {
            focusedNote,
            ancestorNotes,
            replies,
            metadataByPubKeyMap,
            quotedNotesMap,
            childReplyEventTagIds,
            communityInfo
        };
    }

    private async createNoteCommunityMappings(notes: INostrEvent[]) {
        let noteCommunityInfoList: INoteCommunityInfo[] = [];
        let pubkeyToCommunityIdsMap: Record<string, string[]> = {};
        let communityInfoList: ICommunityInfo[] = [];
        for (let note of notes) {
            let scpData = this.extractPostScpData(note);
            if (scpData) {
                const communityUri = this.retrieveCommunityUri(note, scpData);
                if (communityUri) {
                    const creatorId = communityUri.split(':')[1];
                    const communityId = communityUri.split(':')[2];
                    pubkeyToCommunityIdsMap[creatorId] = pubkeyToCommunityIdsMap[creatorId] || [];
                    if (!pubkeyToCommunityIdsMap[creatorId].includes(communityId)) {
                        pubkeyToCommunityIdsMap[creatorId].push(communityId);
                    }
                    noteCommunityInfoList.push({
                        eventData: note,
                        communityUri,
                        communityId,
                        creatorId
                    });
                }
            }
        }

        if (noteCommunityInfoList.length > 0) {
            const communityEvents = await this._socialEventManager.fetchCommunities(pubkeyToCommunityIdsMap);
            for (let event of communityEvents) {
                let communityInfo = this.extractCommunityInfo(event);
                communityInfoList.push(communityInfo);
            }
        }

        return {
            noteCommunityInfoList,
            communityInfoList
        }
    }

    async retrieveUserProfileDetail(pubKey: string) {
        let metadata: INostrMetadata;
        let stats: IUserActivityStats;
        const userContactEvents = await this._socialEventManager.fetchUserProfileDetailCacheEvents(pubKey);
        for (let event of userContactEvents) {
            if (event.kind === 0) {
                metadata = {
                    ...event,
                    content: JSON.parse(event.content)
                };
            }
            else if (event.kind === 10000105) {
                let content = JSON.parse(event.content);
                stats = {
                    notes: content.note_count,
                    replies: content.reply_count,
                    followers: content.followers_count,
                    following: content.follows_count,
                    relays: content.relay_count,
                    timeJoined: content.time_joined
                }
            }
        }
        if (!metadata) return null;
        let userProfile = this.constructUserProfile(metadata);
        return {
            userProfile,
            stats
        }
    }

    private constructUserProfile(metadata: INostrMetadata, followersCountMap?: Record<string, number>) {
        const followersCount = followersCountMap?.[metadata.pubkey] || 0;
        const encodedPubkey = Nip19.npubEncode(metadata.pubkey);
        const metadataContent = metadata.content;
        const internetIdentifier = metadataContent.nip05?.replace('_@', '') || '';
        let userProfile: IUserProfile = {
            id: encodedPubkey,
            username: metadataContent.username,
            description: metadataContent.about,
            avatar: metadataContent.picture,
            pubKey: encodedPubkey,
            displayName: metadataContent.display_name || metadataContent.name,
            internetIdentifier,
            website: metadataContent.website,
            banner: metadataContent.banner,
            followers: followersCount,
            metadata
        }
        return userProfile;
    }

    async fetchUserContactList(pubKey: string) {
        let metadataArr: INostrMetadata[] = [];
        let followersCountMap: Record<string, number> = {};
        const userContactEvents = await this._socialEventManager.fetchContactListCacheEvents(pubKey);
        for (let event of userContactEvents) {
            if (event.kind === 0) {
                metadataArr.push({
                    ...event,
                    content: JSON.parse(event.content)
                });
            }
            else if (event.kind === 10000108) {
                followersCountMap = JSON.parse(event.content);
            }
        }
        const userProfiles: IUserProfile[] = [];
        for (let metadata of metadataArr) {
            let userProfile = this.constructUserProfile(metadata, followersCountMap);
            userProfiles.push(userProfile);
        }
        return userProfiles;
    }

    async fetchUserFollowersList(pubKey: string) {
        let metadataArr: INostrMetadata[] = [];
        let followersCountMap: Record<string, number> = {};
        const userFollowersEvents = await this._socialEventManager.fetchFollowersCacheEvents(pubKey);
        for (let event of userFollowersEvents) {
            if (event.kind === 0) {
                metadataArr.push({
                    ...event,
                    content: JSON.parse(event.content)
                });
            }
            else if (event.kind === 10000108) {
                followersCountMap = JSON.parse(event.content);
            }
        }
        const userProfiles: IUserProfile[] = [];
        for (let metadata of metadataArr) {
            let userProfile = this.constructUserProfile(metadata, followersCountMap);
            userProfiles.push(userProfile);
        }
        return userProfiles;
    }

    async fetchUserRelayList(pubKey: string) {
        let relayList: string[] = [];
        const relaysEvents = await this._socialEventManager.fetchRelaysCacheEvents(pubKey);
        const relaysEvent = relaysEvents.find(event => event.kind === 3);
        let content = JSON.parse(relaysEvent.content);
        relayList = Object.keys(content);
        return relayList;
    }
}

export {
    NostrEventManager,
    ISocialEventManager,
    SocialDataManager
}