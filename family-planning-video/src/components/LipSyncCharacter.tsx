import React from 'react';
import {Character, CharacterProps} from './Character';
import {mouthFor, speakingEnvelope} from '../data/lipSync';

/**
 * Character driven by lip_sync_30fps.csv: mouth opens only when the CSV lists
 * this character as the active speaker. Speaker gets a tiny onset ease (lift)
 * and slightly fuller breathing; listeners stay calmer.
 */
export const LipSyncCharacter: React.FC<Omit<CharacterProps, 'mouthState'> & {visibleMouth?: boolean}> = (props) => {
  const {who, frame, visibleMouth = true, lift = 0, breath} = props;
  const env = speakingEnvelope(who, frame);
  return (
    <Character
      {...props}
      mouthState={visibleMouth ? mouthFor(who, frame) : 0}
      lift={lift - env * 4}
      breath={breath ?? 0.007 + env * 0.004}
    />
  );
};
