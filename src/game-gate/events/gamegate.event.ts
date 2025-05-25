export const GameGateEvent = {
    Notification: {
        JoinGameGateService: "JoinGameGateEvent",
        CreateGameRoom: "CreateGameRoomEvent",
        JoinGameRoom: "JoinGameRoomEvent",
        LeaveGameRoom: "LeaveGameRoomEvent",
        StartGame: "StartGameEvent",
        SendAnswer: "SendAnswerEvent",
        JudgeAnswers: "JudgeAnswersEvent",
        SendWatingMessage: "SendWaitingMessage",
        GetAvailableRoom: "GetAvailableRoomEvent",
        GetRoomInfo: "GetRoomInfoEvent"
    },
    Debug: {
        GetGameStatus: "GetGameStatusEvent",
        WhereUser: "debug"
    },
    InGame: 'InGame'
}