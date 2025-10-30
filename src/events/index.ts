import {DATABASE_EVENT_TYPE, DatabaseEvent} from "@models/events.js";
import {sendRivalBeatUserScoreNotification, sendUserBeatsRivalScoreNotification} from "@events/rivalNotification.js";

export async function handleDatabaseEvent(event: DatabaseEvent) {
    switch (event.type) {
        case DATABASE_EVENT_TYPE.RIVAL_BEATS_USER:
            await sendRivalBeatUserScoreNotification(event.data);
            break;
        case DATABASE_EVENT_TYPE.USER_BEATS_RIVAL:
            await sendUserBeatsRivalScoreNotification(event.data);
            break;
    }
}