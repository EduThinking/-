import { describe, expect, it } from "vitest";
import { koNumber, parseVoice } from "../src/lib/voiceParser";

const at = (h: number, m = 0) => new Date(2026, 9, 7, h, m, 0);

describe("koNumber", () => {
  it("parses sino, native and digits", () => {
    expect(koNumber("삼십오")).toBe(35);
    expect(koNumber("십")).toBe(10);
    expect(koNumber("열두")).toBe(12);
    expect(koNumber("15")).toBe(15);
  });
});

describe("parseVoice", () => {
  it.each([
    ["일어났어", "WAKE_UP"],
    ["아기 지금 일어났어", "WAKE_UP"],
    ["낮잠 잤어", "NAP_START"],
    ["방금 낮잠 들었어", "NAP_START"],
    ["낮잠에서 깼어", "NAP_END"],
    ["밤잠 들었어", "NIGHT_SLEEP_START"],
    ["밤에 깼어", "NIGHT_WAKE"],
    ["다시 잠들었어", "BACK_TO_SLEEP"],
  ])("%s → %s", (text, intent) => {
    const r = parseVoice(text, at(14, 20));
    expect(r.intent).toBe(intent);
  });

  it("uses now for confident utterances", () => {
    const r = parseVoice("방금 낮잠 들었어", at(14, 20));
    expect(r.requires_confirmation).toBe(false);
    expect(new Date(r.event_time!).getHours()).toBe(14);
    expect(new Date(r.event_time!).getMinutes()).toBe(20);
  });

  it("handles relative minutes", () => {
    const r = parseVoice("10분 전에 잠들었어", at(14, 20));
    expect(r.intent).toBe("NAP_START");
    expect(new Date(r.event_time!).getMinutes()).toBe(10);
    const k = parseVoice("삼십 분 전에 낮잠 깼어", at(14, 20));
    expect(new Date(k.event_time!).getHours()).toBe(13);
    expect(new Date(k.event_time!).getMinutes()).toBe(50);
  });

  it("handles clock times choosing the most recent past", () => {
    const r = parseVoice("2시 반에 낮잠 들었어", at(14, 50));
    expect(new Date(r.event_time!).getHours()).toBe(14);
    expect(new Date(r.event_time!).getMinutes()).toBe(30);
    const w = parseVoice("아침 7시에 일어났어", at(14, 50));
    expect(new Date(w.event_time!).getHours()).toBe(7);
  });

  it("never guesses vague times", () => {
    const r = parseVoice("아기가 아까 잤어", at(14, 20));
    expect(r.intent).toBe("NAP_START");
    expect(r.event_time).toBeNull();
    expect(r.requires_confirmation).toBe(true);
  });

  it("returns null intent for unrelated speech", () => {
    const r = parseVoice("기저귀 갈았어", at(10));
    expect(r.intent).toBeNull();
    expect(r.requires_confirmation).toBe(true);
  });
});
