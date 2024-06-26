export declare const utf8Encoder: TextEncoder;
export declare const verifiedSymbol: unique symbol;
export declare enum Kind {
    Metadata = 0,
    Text = 1,
    RecommendRelay = 2,
    Contacts = 3,
    EncryptedDirectMessage = 4,
    EventDeletion = 5,
    Repost = 6,
    Reaction = 7,
    BadgeAward = 8,
    ChannelCreation = 40,
    ChannelMetadata = 41,
    ChannelMessage = 42,
    ChannelHideMessage = 43,
    ChannelMuteUser = 44,
    Blank = 255,
    Report = 1984,
    ZapRequest = 9734,
    Zap = 9735,
    RelayList = 10002,
    ClientAuth = 22242,
    NwcRequest = 23194,
    HttpAuth = 27235,
    ProfileBadge = 30008,
    BadgeDefinition = 30009,
    Article = 30023,
    FileMetadata = 1063
}
export interface Event<K extends number = number> {
    kind: K;
    tags: string[][];
    content: string;
    created_at: number;
    pubkey: string;
    id: string;
    sig: string;
    [verifiedSymbol]?: boolean;
}
export type EventTemplate<K extends number = number> = Pick<Event<K>, 'kind' | 'tags' | 'content' | 'created_at'>;
export type UnsignedEvent<K extends number = number> = Pick<Event<K>, 'kind' | 'tags' | 'content' | 'created_at' | 'pubkey'>;
export interface VerifiedEvent<K extends number = number> extends Event<K> {
    [verifiedSymbol]: true;
}
export declare function getBlankEvent(): EventTemplate<Kind.Blank>;
export declare function getBlankEvent<K extends number>(kind: K): EventTemplate<K>;
export declare function finishEvent<K extends number = number>(t: EventTemplate<K>, privateKey: string): VerifiedEvent<K>;
export declare function serializeEvent(evt: UnsignedEvent<number>): string;
export declare function getEventHash(event: UnsignedEvent<number>): string;
export declare function validateEvent<T>(event: T): event is T & UnsignedEvent<number>;
export declare function verifySignature<K extends number>(event: Event<K>): event is VerifiedEvent<K>;
export declare function signEvent(event: UnsignedEvent<number>, key: string): string;
export declare function getSignature(event: UnsignedEvent<number>, key: string): string;
export declare function getPaymentRequestHash(paymentRequest: string): string;
