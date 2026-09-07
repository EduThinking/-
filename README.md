<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/b4be9e40-49d6-40a1-a69c-215736816b15

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Claude Code Skills

This repo bundles the [slide-master](https://github.com/byungjunjang/slide-master) Claude Code skills under `.claude/skills/` (`ppt-master`, `ppt-template-fill`, `diagram-design`, `native-enhance-pptx`, `codex-image`) for native, editable PPTX generation. Install their Python dependencies with:

```bash
pip install -r requirements.txt
```

License and attribution for these skills are in [`.claude/skills/SLIDE-MASTER-LICENSE`](.claude/skills/SLIDE-MASTER-LICENSE) (MIT, based on [hugohe3/ppt-master](https://github.com/hugohe3/ppt-master)).
