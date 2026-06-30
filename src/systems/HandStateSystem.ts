import { COOLDOWNS, DURATIONS } from '../config/gameConfig';
import type { HandState } from '../types/game';

export class HandStateSystem {
  state: HandState = {
    leftHandFree: false,
    rightHandFree: false,
    inBathroom: false,
    tossBabyActive: false,
    kindergartenActive: false,
  };

  private tossEndTime = 0;
  private kindergartenEndTime = 0;
  private bathroomEndTime = 0;
  private tossCooldownEnd = 0;
  private kindergartenCooldownEnd = 0;
  private bathroomCooldownEnd = 0;

  reset(): void {
    this.state = {
      leftHandFree: false,
      rightHandFree: false,
      inBathroom: false,
      tossBabyActive: false,
      kindergartenActive: false,
    };
    this.tossEndTime = 0;
    this.kindergartenEndTime = 0;
    this.bathroomEndTime = 0;
    this.tossCooldownEnd = 0;
    this.kindergartenCooldownEnd = 0;
    this.bathroomCooldownEnd = 0;
  }

  update(now: number): void {
    if (this.state.tossBabyActive && now >= this.tossEndTime) {
      this.state.tossBabyActive = false;
      this.state.leftHandFree = false;
    }
    if (this.state.kindergartenActive && now >= this.kindergartenEndTime) {
      this.state.kindergartenActive = false;
      this.state.rightHandFree = false;
    }
    if (this.state.inBathroom && now >= this.bathroomEndTime) {
      this.state.inBathroom = false;
      this.state.leftHandFree = false;
      this.state.rightHandFree = false;
    }
  }

  canTossBaby(now: number): boolean {
    return now >= this.tossCooldownEnd && !this.state.tossBabyActive && !this.state.inBathroom;
  }

  canKindergarten(now: number): boolean {
    return now >= this.kindergartenCooldownEnd && !this.state.kindergartenActive && !this.state.inBathroom;
  }

  canBathroom(now: number): boolean {
    return now >= this.bathroomCooldownEnd && !this.state.inBathroom;
  }

  tossBaby(now: number): boolean {
    if (!this.canTossBaby(now)) return false;
    this.state.tossBabyActive = true;
    this.state.leftHandFree = true;
    this.tossEndTime = now + DURATIONS.tossBaby;
    this.tossCooldownEnd = now + COOLDOWNS.tossBaby;
    return true;
  }

  sendToKindergarten(now: number): boolean {
    if (!this.canKindergarten(now)) return false;
    this.state.kindergartenActive = true;
    this.state.rightHandFree = true;
    this.kindergartenEndTime = now + DURATIONS.kindergarten;
    this.kindergartenCooldownEnd = now + COOLDOWNS.kindergarten;
    return true;
  }

  hideInBathroom(now: number): boolean {
    if (!this.canBathroom(now)) return false;
    this.state.inBathroom = true;
    this.state.leftHandFree = true;
    this.state.rightHandFree = true;
    this.state.tossBabyActive = false;
    this.state.kindergartenActive = false;
    this.bathroomEndTime = now + DURATIONS.bathroom;
    this.bathroomCooldownEnd = now + COOLDOWNS.bathroom;
    return true;
  }

  getCooldownRemaining(now: number): { q: number; e: number; r: number } {
    return {
      q: Math.max(0, this.tossCooldownEnd - now),
      e: Math.max(0, this.kindergartenCooldownEnd - now),
      r: Math.max(0, this.bathroomCooldownEnd - now),
    };
  }
}
