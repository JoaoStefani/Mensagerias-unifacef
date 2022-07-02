import { Candidate } from "../entity/candidate.entity";
import RedisCli from "../redis";
import { Queues } from "../enums";
import Mysql from "../Mysql";
import BaseQueue from "./base.queue";
import { socketIo } from "../server";

const redis = RedisCli.getInstance();

export default class CandidateQueue extends BaseQueue {
    
    private static instance: CandidateQueue;
    public static getInstance(): CandidateQueue {
        if (!CandidateQueue.instance) {
            CandidateQueue.instance = new CandidateQueue();
        }

        return CandidateQueue.instance;
    }

    private constructor() {
        super(Queues.candidate)
        this.queue.process((data) => this.process(data));
    }

    private async process({ data }) {
        console.log(data);
        //const { name, partyNumber, photo } = data;
        await this.createCandidate(data.name, data.partyNumber, data.photo);
    }

    private async createCandidate(name: string, partyNumber: number, photo: string) {

        console.log("Criando novo cnadidato ...");
        const candidate = new Candidate();
        candidate.name = name;
        candidate.partyNumber = partyNumber;
        candidate.photo  = photo;
 
        await Mysql.manager.save(candidate);

        console.log(`Candidatp ${name} - ${partyNumber} criandocom sucesso.`);
        
        //Select no candidate
        const candidates = await Mysql.manager.find(Candidate);

        //Redis
        await redis.setJson('candidates', candidates);
        this.emitSocket(candidates);
    }

    private emitSocket(candidates) {

        socketIo.emit('candidates', candidates);
        console.log('Candidatos enviados via socket');

    } 
}