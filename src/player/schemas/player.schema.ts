
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema, Types } from 'mongoose'; 
import { v4 as uuidv4 } from 'uuid'; 
import { HydratedDocument } from 'mongoose';

export type PlayerDocument = HydratedDocument<Player>;

@Schema({ timestamps: true })
export class Player {
    @Prop({
        type: MongooseSchema.Types.UUID,
        default: () => uuidv4(),
        required: true,
        unique: true,
        index: true
    })
    playerUUID: string;

    @Prop({
        required: true,
        unique: true,
    })
    playerEmail: string;

    @Prop()
    playerUserName: string;

    @Prop({
        required: true
    })
    playerPassword: string;

    @Prop()
    playerLevel: number;

    @Prop()
    playerCurrentExp: number;
}

export const PlayerSchema = SchemaFactory.createForClass(Player);
