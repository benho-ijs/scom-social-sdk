import { Nip19, Event } from "../core/index";
import { ICalendarEventDetailInfo, ICalendarEventInfo, IChannelInfo, ICommunity, ICommunityBasicInfo, ICommunityInfo, ICommunityMember, IConversationPath, ILocationCoordinates, ILongFormContentInfo, IMessageContactInfo, INewCalendarEventPostInfo, INewChannelMessageInfo, INewCommunityInfo, INewCommunityPostInfo, INostrEvent, INostrFetchEventsResponse, INostrMetadata, INostrMetadataContent, INostrSubmitResponse, INoteCommunityInfo, INoteInfo, IPostStats, IRetrieveChannelMessageKeysOptions, IRetrieveCommunityPostKeysByNoteEventsOptions, IRetrieveCommunityPostKeysOptions, IRetrieveCommunityThreadPostKeysOptions, ISocialDataManagerConfig, IUpdateCalendarEventInfo, IUserActivityStats, IUserProfile } from "./interfaces";
interface IFetchMetadataOptions {
    authors?: string[];
    decodedAuthors?: string[];
}
interface INostrCommunicationManager {
    fetchEvents(...requests: any): Promise<INostrFetchEventsResponse>;
    fetchCachedEvents(eventType: string, msg: any): Promise<INostrFetchEventsResponse>;
    submitEvent(event: Event.VerifiedEvent<number>): Promise<INostrSubmitResponse>;
}
interface ISocialEventManagerWrite {
    updateContactList(content: string, contactPubKeys: string[], privateKey: string): Promise<void>;
    postNote(content: string, privateKey: string, conversationPath?: IConversationPath): Promise<void>;
    deleteEvents(eventIds: string[], privateKey: string): Promise<INostrSubmitResponse[]>;
    updateCommunity(info: ICommunityInfo, privateKey: string): Promise<INostrSubmitResponse[]>;
    updateChannel(info: IChannelInfo, privateKey: string): Promise<INostrSubmitResponse[]>;
    updateUserBookmarkedChannels(channelEventIds: string[], privateKey: string): Promise<void>;
    submitChannelMessage(info: INewChannelMessageInfo, privateKey: string): Promise<void>;
    updateUserBookmarkedCommunities(communities: ICommunityBasicInfo[], privateKey: string): Promise<void>;
    submitCommunityPost(info: INewCommunityPostInfo, privateKey: string): Promise<void>;
    updateUserProfile(content: INostrMetadataContent, privateKey: string): Promise<void>;
    sendMessage(receiver: string, encryptedMessage: string, privateKey: string): Promise<void>;
    updateGroupKeys(identifier: string, groupKind: number, keys: string, invitees: string[], privateKey: string): Promise<INostrSubmitResponse[]>;
    updateCalendarEvent(info: IUpdateCalendarEventInfo, privateKey: string): Promise<INostrSubmitResponse[]>;
    createCalendarEventRSVP(rsvpId: string, calendarEventUri: string, accepted: boolean, privateKey: string): Promise<INostrSubmitResponse[]>;
    submitCalendarEventPost(info: INewCalendarEventPostInfo, privateKey: string): Promise<INostrSubmitResponse[]>;
    submitLongFormContentEvents(info: ILongFormContentInfo, privateKey: string): Promise<void>;
    submitLike(tags: string[][], privateKey: string): Promise<void>;
    submitRepost(content: string, tags: string[][], privateKey: string): Promise<void>;
}
interface ISocialEventManagerRead {
    fetchThreadCacheEvents(id: string, pubKey?: string): Promise<INostrEvent[]>;
    fetchTrendingCacheEvents(pubKey?: string): Promise<INostrEvent[]>;
    fetchProfileFeedCacheEvents(pubKey: string, since?: number, until?: number): Promise<INostrEvent[]>;
    fetchProfileRepliesCacheEvents(pubKey: string, since?: number, until?: number): Promise<INostrEvent[]>;
    fetchHomeFeedCacheEvents(pubKey?: string, since?: number, until?: number): Promise<INostrEvent[]>;
    fetchUserProfileCacheEvents(pubKeys: string[]): Promise<INostrEvent[]>;
    fetchUserProfileDetailCacheEvents(pubKey: string): Promise<INostrEvent[]>;
    fetchContactListCacheEvents(pubKey: string, detailIncluded?: boolean): Promise<INostrEvent[]>;
    fetchFollowersCacheEvents(pubKey: string): Promise<INostrEvent[]>;
    fetchCommunities(pubkeyToCommunityIdsMap?: Record<string, string[]>): Promise<INostrEvent[]>;
    fetchAllUserRelatedCommunities(pubKey: string): Promise<INostrEvent[]>;
    fetchUserBookmarkedCommunities(pubKey: string): Promise<INostrEvent[]>;
    fetchCommunity(creatorId: string, communityId: string): Promise<INostrEvent[]>;
    fetchCommunityFeed(creatorId: string, communityId: string): Promise<INostrEvent[]>;
    fetchCommunitiesGeneralMembers(communities: ICommunityBasicInfo[]): Promise<INostrEvent[]>;
    fetchMetadata(options: IFetchMetadataOptions): Promise<INostrEvent[]>;
    fetchChannels(channelEventIds: string[]): Promise<INostrEvent[]>;
    fetchAllUserRelatedChannels(pubKey: string): Promise<INostrEvent[]>;
    fetchUserBookmarkedChannels(pubKey: string): Promise<INostrEvent[]>;
    fetchChannelMessages(channelId: string, since?: number, until?: number): Promise<INostrEvent[]>;
    fetchChannelInfoMessages(creatorId: string, channelId: string): Promise<INostrEvent[]>;
    fetchMessageContactsCacheEvents(pubKey: string): Promise<INostrEvent[]>;
    fetchDirectMessages(pubKey: string, sender: string, since?: number, until?: number): Promise<INostrEvent[]>;
    resetMessageCount(pubKey: string, sender: string, privateKey: string): Promise<void>;
    fetchGroupKeys(identifier: string): Promise<INostrEvent>;
    fetchUserGroupInvitations(groupKinds: number[], pubKey: string): Promise<INostrEvent[]>;
    fetchCalendarEventPosts(calendarEventUri: string): Promise<INostrEvent[]>;
    fetchCalendarEvents(start: number, end?: number, limit?: number): Promise<INostrEvent[]>;
    fetchCalendarEvent(address: Nip19.AddressPointer): Promise<INostrEvent | null>;
    fetchCalendarEventRSVPs(calendarEventUri: string, pubkey?: string): Promise<INostrEvent[]>;
    fetchLongFormContentEvents(pubKey?: string, since?: number, until?: number): Promise<INostrEvent[]>;
    fetchLikes(eventId: string): Promise<INostrEvent[]>;
}
declare class NostrWebSocketManager implements INostrCommunicationManager {
    protected _url: string;
    protected ws: any;
    protected requestCallbackMap: Record<string, (message: any) => void>;
    protected messageListenerBound: any;
    constructor(url: any);
    get url(): string;
    set url(url: string);
    generateRandomNumber(): string;
    messageListener(event: any): void;
    establishConnection(requestId: string, cb: (message: any) => void): Promise<{
        ws: any;
        error: any;
    }>;
    fetchEvents(...requests: any): Promise<INostrFetchEventsResponse>;
    fetchCachedEvents(eventType: string, msg: any): Promise<INostrFetchEventsResponse>;
    submitEvent(event: Event.VerifiedEvent<number>): Promise<INostrSubmitResponse>;
}
declare class NostrEventManagerWrite implements ISocialEventManagerWrite {
    private _nostrCommunicationManagers;
    private _apiBaseUrl;
    constructor(managers: INostrCommunicationManager[], apiBaseUrl: string);
    private calculateConversationPathTags;
    updateContactList(content: string, contactPubKeys: string[], privateKey: string): Promise<void>;
    postNote(content: string, privateKey: string, conversationPath?: IConversationPath): Promise<void>;
    deleteEvents(eventIds: string[], privateKey: string): Promise<INostrSubmitResponse[]>;
    updateChannel(info: IChannelInfo, privateKey: string): Promise<INostrSubmitResponse[]>;
    updateUserBookmarkedChannels(channelEventIds: string[], privateKey: string): Promise<void>;
    updateCommunity(info: ICommunityInfo, privateKey: string): Promise<INostrSubmitResponse[]>;
    updateUserBookmarkedCommunities(communities: ICommunityBasicInfo[], privateKey: string): Promise<void>;
    submitCommunityPost(info: INewCommunityPostInfo, privateKey: string): Promise<void>;
    submitChannelMessage(info: INewChannelMessageInfo, privateKey: string): Promise<void>;
    updateUserProfile(content: INostrMetadataContent, privateKey: string): Promise<void>;
    sendMessage(receiver: string, encryptedMessage: string, privateKey: string): Promise<void>;
    updateGroupKeys(identifier: string, groupKind: number, keys: string, invitees: string[], privateKey: string): Promise<INostrSubmitResponse[]>;
    updateCalendarEvent(info: IUpdateCalendarEventInfo, privateKey: string): Promise<INostrSubmitResponse[]>;
    createCalendarEventRSVP(rsvpId: string, calendarEventUri: string, accepted: boolean, privateKey: string): Promise<INostrSubmitResponse[]>;
    submitCalendarEventPost(info: INewCalendarEventPostInfo, privateKey: string): Promise<INostrSubmitResponse[]>;
    submitLongFormContentEvents(info: ILongFormContentInfo, privateKey: string): Promise<void>;
    submitLike(tags: string[][], privateKey: string): Promise<void>;
    submitRepost(content: string, tags: string[][], privateKey: string): Promise<void>;
}
declare class NostrEventManagerRead implements ISocialEventManagerRead {
    protected _nostrCommunicationManager: INostrCommunicationManager;
    protected _nostrCachedCommunicationManager: INostrCommunicationManager;
    protected _apiBaseUrl: string;
    constructor(manager: INostrCommunicationManager, cachedManager: INostrCommunicationManager, apiBaseUrl: string);
    fetchThreadCacheEvents(id: string, pubKey?: string): Promise<INostrEvent[]>;
    fetchTrendingCacheEvents(pubKey?: string): Promise<INostrEvent[]>;
    fetchProfileFeedCacheEvents(pubKey: string, since?: number, until?: number): Promise<INostrEvent[]>;
    fetchProfileRepliesCacheEvents(pubKey: string, since?: number, until?: number): Promise<INostrEvent[]>;
    fetchHomeFeedCacheEvents(pubKey?: string, since?: number, until?: number): Promise<INostrEvent[]>;
    fetchUserProfileCacheEvents(pubKeys: string[]): Promise<INostrEvent[]>;
    fetchUserProfileDetailCacheEvents(pubKey: string): Promise<INostrEvent[]>;
    fetchContactListCacheEvents(pubKey: string, detailIncluded?: boolean): Promise<INostrEvent[]>;
    fetchFollowersCacheEvents(pubKey: string): Promise<INostrEvent[]>;
    fetchCommunities(pubkeyToCommunityIdsMap?: Record<string, string[]>): Promise<any>;
    fetchAllUserRelatedCommunities(pubKey: string): Promise<INostrEvent[]>;
    fetchUserBookmarkedCommunities(pubKey: string): Promise<INostrEvent[]>;
    fetchCommunity(creatorId: string, communityId: string): Promise<INostrEvent[]>;
    fetchCommunityFeed(creatorId: string, communityId: string): Promise<INostrEvent[]>;
    fetchCommunitiesGeneralMembers(communities: ICommunityBasicInfo[]): Promise<INostrEvent[]>;
    fetchMetadata(options: IFetchMetadataOptions): Promise<INostrEvent[]>;
    fetchAllUserRelatedChannels(pubKey: string): Promise<INostrEvent[]>;
    fetchUserBookmarkedChannels(pubKey: string): Promise<INostrEvent[]>;
    fetchChannels(channelEventIds: string[]): Promise<INostrEvent[]>;
    fetchChannelMessages(channelId: string, since?: number, until?: number): Promise<INostrEvent[]>;
    fetchChannelInfoMessages(creatorId: string, channelId: string): Promise<INostrEvent[]>;
    fetchMessageContactsCacheEvents(pubKey: string): Promise<INostrEvent[]>;
    fetchDirectMessages(pubKey: string, sender: string, since?: number, until?: number): Promise<INostrEvent[]>;
    resetMessageCount(pubKey: string, sender: string, privateKey: string): Promise<void>;
    fetchGroupKeys(identifier: string): Promise<INostrEvent>;
    fetchUserGroupInvitations(groupKinds: number[], pubKey: string): Promise<INostrEvent[]>;
    fetchCalendarEvents(start: number, end?: number, limit?: number): Promise<INostrEvent[]>;
    fetchCalendarEvent(address: Nip19.AddressPointer): Promise<INostrEvent>;
    fetchCalendarEventPosts(calendarEventUri: string): Promise<INostrEvent[]>;
    fetchCalendarEventRSVPs(calendarEventUri: string, pubkey?: string): Promise<INostrEvent[]>;
    fetchLongFormContentEvents(pubKey?: string, since?: number, until?: number): Promise<INostrEvent[]>;
    fetchLikes(eventId: string): Promise<INostrEvent[]>;
}
declare class SocialUtilsManager {
    static hexStringToUint8Array(hexString: string): Uint8Array;
    static base64ToUtf8(base64: string): string;
    static convertPrivateKeyToPubkey(privateKey: string): string;
    static encryptMessage(ourPrivateKey: string, theirPublicKey: string, text: string): Promise<string>;
    static decryptMessage(ourPrivateKey: string, theirPublicKey: string, encryptedData: string): Promise<string>;
    private static pad;
    static getGMTOffset(timezone: string): string;
    static exponentialBackoffRetry<T>(fn: () => Promise<T>, retries: number, delay: number, maxDelay: number, factor: number): Promise<T>;
}
declare class SocialDataManager {
    private _defaultRestAPIRelay;
    private _apiBaseUrl;
    private _ipLocationServiceBaseUrl;
    private _socialEventManagerRead;
    private _socialEventManagerWrite;
    private _privateKey;
    private mqttManager;
    constructor(config: ISocialDataManagerConfig);
    set privateKey(privateKey: string);
    get socialEventManagerRead(): ISocialEventManagerRead;
    get socialEventManagerWrite(): ISocialEventManagerWrite;
    subscribeToMqttTopics(topics: string[]): void;
    unsubscribeFromMqttTopics(topics: string[]): void;
    publishToMqttTopic(topic: string, message: string): void;
    extractCommunityInfo(event: INostrEvent): ICommunityInfo;
    retrieveCommunityEvents(creatorId: string, communityId: string): Promise<{
        notes: INostrEvent[];
        info: ICommunityInfo;
    }>;
    retrieveCommunityUri(noteEvent: INostrEvent, scpData: any): string;
    private extractScpData;
    retrievePostPrivateKey(event: INostrEvent, communityUri: string, communityPrivateKey: string): Promise<string>;
    retrieveChannelMessagePrivateKey(event: INostrEvent, channelId: string, communityPrivateKey: string): Promise<string>;
    retrieveCommunityPrivateKey(communityInfo: ICommunityInfo, selfPrivateKey: string): Promise<string>;
    retrieveCommunityPostKeys(options: IRetrieveCommunityPostKeysOptions): Promise<Record<string, string>>;
    retrieveCommunityThreadPostKeys(options: IRetrieveCommunityThreadPostKeysOptions): Promise<Record<string, string>>;
    retrieveCommunityPostKeysByNoteEvents(options: IRetrieveCommunityPostKeysByNoteEventsOptions): Promise<Record<string, string>>;
    constructMetadataByPubKeyMap(notes: INostrEvent[]): Promise<Record<string, INostrMetadata>>;
    fetchUserProfiles(pubKeys: string[]): Promise<IUserProfile[]>;
    updateUserProfile(content: INostrMetadataContent): Promise<void>;
    fetchTrendingNotesInfo(): Promise<{
        notes: INoteInfo[];
        metadataByPubKeyMap: Record<string, INostrMetadata>;
    }>;
    fetchProfileFeedInfo(pubKey: string, since?: number, until?: number): Promise<{
        notes: INoteInfo[];
        metadataByPubKeyMap: Record<string, INostrMetadata>;
        quotedNotesMap: Record<string, INoteInfo>;
        earliest: number;
    }>;
    fetchProfileRepliesInfo(pubKey: string, since?: number, until?: number): Promise<{
        notes: INoteInfo[];
        metadataByPubKeyMap: Record<string, INostrMetadata>;
        quotedNotesMap: Record<string, INoteInfo>;
        earliest: number;
    }>;
    private getEarliestEventTimestamp;
    fetchHomeFeedInfo(pubKey: string, since?: number, until?: number): Promise<{
        notes: INoteInfo[];
        metadataByPubKeyMap: Record<string, INostrMetadata>;
        quotedNotesMap: Record<string, INoteInfo>;
        earliest: number;
    }>;
    parseContent(content: string): any;
    createNoteEventMappings(events: INostrEvent[], parentAuthorsInfo?: boolean): {
        notes: INoteInfo[];
        metadataByPubKeyMap: Record<string, INostrMetadata>;
        quotedNotesMap: Record<string, INoteInfo>;
        noteToParentAuthorIdMap: Record<string, string>;
        noteStatsMap: Record<string, IPostStats>;
        noteToRepostIdMap: Record<string, string>;
    };
    fetchCommunityInfo(creatorId: string, communityId: string): Promise<ICommunityInfo>;
    fetchThreadNotesInfo(focusedNoteId: string): Promise<{
        focusedNote: INoteInfo;
        ancestorNotes: INoteInfo[];
        replies: INoteInfo[];
        quotedNotesMap: Record<string, INoteInfo>;
        metadataByPubKeyMap: Record<string, INostrMetadata>;
        childReplyEventTagIds: string[];
        communityInfo: ICommunityInfo;
    }>;
    createNoteCommunityMappings(notes: INostrEvent[]): Promise<{
        noteCommunityInfoList: INoteCommunityInfo[];
        communityInfoList: ICommunityInfo[];
    }>;
    retrieveUserProfileDetail(pubKey: string): Promise<{
        userProfile: IUserProfile;
        stats: IUserActivityStats;
    }>;
    private constructUserProfile;
    fetchUserContactList(pubKey: string): Promise<IUserProfile[]>;
    fetchUserFollowersList(pubKey: string): Promise<IUserProfile[]>;
    fetchUserRelayList(pubKey: string): Promise<string[]>;
    followUser(userPubKey: string): Promise<void>;
    unfollowUser(userPubKey: string): Promise<void>;
    getCommunityUri(creatorId: string, communityId: string): string;
    generateGroupKeys(privateKey: string, encryptionPublicKeys: string[]): Promise<{
        groupPrivateKey: string;
        groupPublicKey: string;
        encryptedGroupKeys: Record<string, string>;
    }>;
    createCommunity(newInfo: INewCommunityInfo, creatorId: string): Promise<ICommunityInfo>;
    updateCommunity(info: ICommunityInfo): Promise<ICommunityInfo>;
    updateCommunityChannel(communityInfo: ICommunityInfo): Promise<INostrSubmitResponse[]>;
    createChannel(channelInfo: IChannelInfo, memberIds: string[]): Promise<IChannelInfo>;
    fetchCommunitiesMembers(communities: ICommunityInfo[]): Promise<Record<string, ICommunityMember[]>>;
    fetchCommunities(): Promise<ICommunity[]>;
    fetchMyCommunities(pubKey: string): Promise<ICommunityInfo[]>;
    private extractBookmarkedCommunities;
    private extractBookmarkedChannels;
    joinCommunity(community: ICommunityInfo, pubKey: string): Promise<void>;
    leaveCommunity(community: ICommunityInfo, pubKey: string): Promise<void>;
    private encryptGroupMessage;
    submitCommunityPost(message: string, info: ICommunityInfo, conversationPath?: IConversationPath): Promise<void>;
    private extractChannelInfo;
    fetchAllUserRelatedChannels(pubKey: string): Promise<IChannelInfo[]>;
    retrieveChannelMessages(channelId: string, since?: number, until?: number): Promise<INostrEvent[]>;
    retrieveChannelEvents(creatorId: string, channelId: string): Promise<{
        messageEvents: INostrEvent[];
        info: IChannelInfo;
    }>;
    retrieveChannelMessageKeys(options: IRetrieveChannelMessageKeysOptions): Promise<Record<string, string>>;
    submitChannelMessage(message: string, channelId: string, communityPublicKey: string, conversationPath?: IConversationPath): Promise<void>;
    fetchDirectMessagesBySender(selfPubKey: string, senderPubKey: string, since?: number, until?: number): Promise<{
        decodedSenderPubKey: string;
        encryptedMessages: any[];
        metadataByPubKeyMap: Record<string, INostrMetadata>;
    }>;
    sendDirectMessage(chatId: string, message: string): Promise<void>;
    resetMessageCount(selfPubKey: string, senderPubKey: string): Promise<void>;
    fetchMessageContacts(pubKey: string): Promise<IMessageContactInfo[]>;
    fetchUserGroupInvitations(pubKey: string): Promise<string[]>;
    private mapCommunityUriToMemberIdRoleCombo;
    private extractCalendarEventInfo;
    updateCalendarEvent(updateCalendarEventInfo: IUpdateCalendarEventInfo): Promise<string>;
    retrieveCalendarEventsByDateRange(start: number, end?: number, limit?: number): Promise<ICalendarEventInfo[]>;
    retrieveCalendarEvent(naddr: string): Promise<ICalendarEventDetailInfo>;
    acceptCalendarEvent(rsvpId: string, naddr: string): Promise<void>;
    declineCalendarEvent(rsvpId: string, naddr: string): Promise<void>;
    submitCalendarEventPost(naddr: string, message: string, conversationPath?: IConversationPath): Promise<string>;
    fetchTimezones(): Promise<any[]>;
    fetchCitiesByKeyword(keyword: string): Promise<any[]>;
    fetchCitiesByCoordinates(latitude: number, longitude: number): Promise<any[]>;
    fetchLocationInfoFromIP(): Promise<ILocationCoordinates>;
    private fetchEventMetadataFromIPFS;
    getAccountBalance(walletAddress: string): Promise<any>;
    getNFTsByOwner(walletAddress: string): Promise<any>;
    submitMessage(message: string, conversationPath?: IConversationPath): Promise<void>;
    submitLongFormContent(info: ILongFormContentInfo): Promise<void>;
    submitLike(postEventData: INostrEvent): Promise<void>;
    submitRepost(postEventData: INostrEvent): Promise<void>;
    sendPingRequest(pubkey: string, walletAddress: string, signature: string): Promise<any>;
    fetchUnreadMessageCounts(pubkey: string): Promise<any>;
    updateMessageLastReadReceipt(pubkey: string, walletAddress: string, signature: string, fromId: string): Promise<any>;
}
export { NostrEventManagerRead, NostrEventManagerWrite, ISocialEventManagerRead, ISocialEventManagerWrite, SocialUtilsManager, SocialDataManager, NostrWebSocketManager };
