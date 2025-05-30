import { Injectable } from '@nestjs/common';
import { Player } from './schemas/player.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

@Injectable()
export class PlayerService {
    constructor(
        @InjectModel(Player.name) private readonly playerModel: Model<Player>
    ) { }

    create = async (playerDto: PlayerDto): Promise<Player> => {
        let playerDocument;
        try {
            const createdPlayer = new this.playerModel(playerDto)
            playerDocument = await createdPlayer.save();
        } catch (error) {
            throw error;
        }
        return playerDocument;
    }

    findAll = async (): Promise<Player[] | null> => {
        return await this.playerModel.find().exec();
    }

    findOneByUsername = async (username: string): Promise<Player | null> => {
        return await this.playerModel.findOne({ playerUserName: username }).exec();
    }

    findOneByEmail = async (usermail: string): Promise<Player | null> => {
        return await this.playerModel.findOne({ playerEmail: usermail})
    }

    findOneByUUID = async (uuid: string): Promise<Player | null> => {
        return await this.playerModel.findOne({ playerUUID: uuid }).exec();
    }

    changePassword = async (uuid: string, password: string): Promise<Player | null> => {
        return await this.playerModel.findOneAndUpdate({playerUUID: uuid}, {playerPassword: password}, {new: true, runValidators: true}).exec();
    }


}
