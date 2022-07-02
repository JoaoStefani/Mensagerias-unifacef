import { Vote } from "../entity/vote.entity";
import RedisCli from "../redis";
import { Queues } from "../enums";
import Mysql from "../Mysql";
import BaseQueue from "./base.queue";
import { socketIo } from "../server";

const redis = RedisCli.getInstance();

export default class VoteQueue extends BaseQueue {
    
    private static instance: VoteQueue;
    public static getInstance(): VoteQueue {
        if (!VoteQueue.instance) {
            VoteQueue.instance = new VoteQueue();
        }

        return VoteQueue.instance;
    }

    private constructor() {
        super(Queues.vote)
        this.queue.process((data) => this.process(data));
    }

    private async process({ data }) {
        console.log(data);
        //const { name, partyNumber, photo } = data;
        await this.saveVote(data.partyNumber);
    }

    private async saveVote(partyNumber: number) {

        console.log("Salvado novo voto...");
        const vote = new Vote();
        vote.partyNumber = partyNumber;
 
        await Mysql.manager.save(vote);

        console.log(`Voto ${partyNumber} salvado com sucesso.`);
        
        //Select no candidate
        const votes = await Mysql.manager.countBy(Vote, { partyNumber });

        //Redis
        await this.setVotes(partyNumber, votes);
    }

    private async setVotes(partyNumber: number, votesQuantity: number) {
        let votes = await redis.getJSON('votes');

        if (votes === undefined) {
            votes = {};
        }

        if (!votes[partyNumber]) {
            votes[partyNumber] = 0;
        }

        votes[partyNumber] = votesQuantity;
        await redis.setJson('votes', votes);

        this.emitSocket(votes);
    }

    private emitSocket(votes) {

        socketIo.emit('votes', votes);
        console.log('Vote enviado via socket');

    } 
}