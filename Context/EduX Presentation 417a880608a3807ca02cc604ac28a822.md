# EduX Presentation

Column: November 13, 2026 2:12 PM

**Recall**

**Details**

- Adaption
    - AI platform, helps create datasets & finetune AI models
    - Use Cambridge EduX referral link to create account
    - Procedure:
        - Give raw data
        - Adaptive Data turns into training-ready data & QCs
        - AutoScientist runs automated training research loop, results in trained model w/ exportable weights
        - Can download weights/push to HF/Kaggle
- TruFar
    - AI platform to help build AI agents
    - Can create chatbot agent & provide knowledge base (RAG)
        - Stores variables e.g. age, art interest
        - Stores system prompt
    - Can create application agent
        - Design custom interface
- Manifest
    - AI-powered spatial intelligence infrastructure & 3D world generator
    - Feature 1: AI-powered 3D/scene generation
        - Creates assets, so can edit granularly
    - Feature 2: 3D modelling & automatic rigging
        - Add skeleton structures, animate, etc.
        - Embed LLM into 3D model
    - Feature 3: 3D world models based on img
    - Feature 4: visual scene editor & project mgmt e.g. real-time 3D manipulation
    - Feature 5: 2D-to-3D conversion, can be deployed to all devices
    - Workflow: describe, generate scene, refine w/ visual editor/AI assistant, add AI-gen 3D models, and export & share
- Demo day
    - 1:30-1:45 - registration, setup
    - 1:45-2:00 - rules, judge intro
    - 2:00-4:15 - judging for track winners
    - 4:30-4:45 - announce track winners
    - 4:45-5:45 - 4 grps pitch in front of everyone
    - 5:45-6:00 - grand champion
- Judging
    - Typical
        - Each team has stand, present in expo style, 8 mins; present to ≥ 2 judges
    - Arena
        - Teams grped into small arenas based on challenge tracks
        - Each team has 10 mins to present & answer q’s
        - Each arena has 2 judges which scores teams on spot
        - Top 2 teams from each track advances to final debate round
    - Final Debate
        - R1: project defense, 3 min/team
        - R2: why your approach, why stand out, why effective, 1.5 min/team
        - R3: judge open Q&A, each w/in 30 seconds, 4 min total
        - No interruptions, let product speak w/ live demos & interactive experiences, appreciate different perspectives
    - Final Scoring: 50% Arena, 50% Final Debate
- Potential datasets
    - Eedi

- Challenge 1: Beyond the Prompt, Rethinking AI Literacy Assessment
    - Design innovative, tech-enabled assessment system eval ability use AI effectively, critically & responsibly + meaningful feedback to develop AI literacy, independent thinking
    - Motivation: students expected use effectively, but trad assessments measure AI knowledge vs usage; must measure CT, responsible decision-making, ability recognize AI limitations
- Challenge 2: Setting the Standard, What Expect from EdTech
    - Develop tech-enabled eval sys assessing safety, usability, learning impact of EdTech products
    - Motivation: products typ measured thru engagement, completion rates, user satisfaction; don’t necessarily reflect learning outcomes, safety & accessibility; need more comprehensive, evidence-informed eval
- Challenge 3: Turning World Around into Classroom
    - Design tech-supported learning exps transforming phys envs & surroundings into interactive classrooms
    - Motivation: education oft disconected from physical surroundings; need encourage real-world exploration, make experiential learning more accessible
- Challenge 4: Building Tomorrow, Immersive Worlds for Future Citizenship
    - Design immersive learning experiences to explore future societies, navigate ethical dilemmas, develop CT & resp dec-making in AI-driven world
    - Motivation: trad approaches leave limited room to imagine alt societies, complex ethical questions; want experience possible futures
    - Explore Manifest to build immersive experience; will have 3 VR headsets for demo day
- Submission Requirements
    
    Note: Deck & Demo won’t be in judging criteria
    
    - Pitch Deck (in Google Doc) outlining project, can incl problem, proposed solution, key feats, potential ed impact
    - Demo Video 2-3 mins: demonstrate prototype, key funcs, how solution works
    - Prototype Link: to deployed product, GitHub repo, interactive prototype (but can also just run locally if needed)
- Judging Criteria
    - Human-centred Application & Challenge Relevance
        - Clarity of real user problem solved
        - Depth of understanding of target users & context
        - Demonstrate appropriate ed & psych theories and how translated in product design
    - Tech Implementation & Feasibility
        - Soundness of tech appproach & arch
        - Effective use of AI & tech to enable soln
        - Evidence prototype works or achievable w/in realistic constraints
    - Responsible AI & Ethics
        - Proactive consideration of fairness, privacy, safety, transparency, accountability
        - Identify potential risks e.g. bias, harm to vuln users + credible mitigation strats and governance practices
    - Creativity & Innovation
        - Originality and novel recombination of existing approaches
        - Clear value beyond std/expected solns, attention to meaningful impact in real ed settings
- TIps
    - Maximize use of tech stacks
    - Consider social & educational perspectives
    - For Challenge 4, have 3 headsets so take turns
- Prize Pool
    - Track winners: 200 GBP
    - Grand champion: extra 200 GBP
    - Extra rewards: additional Adaption credits, mentorship from partners, presentation opps across gloal network
- Key Principles
    - Human-in-loop

Workshop - TruFar

- Application-style agents
    
    ![image.png](EduX%20Presentation/image.png)
    
    ![image.png](EduX%20Presentation/image%201.png)
    
    - Drag & drop components, including interface, workflow
- Example agents
    - Reverse Clock (History Agent): input history event, agent will tell what happened & give 3 choice, will then move you into parallel universe to change history
    
    ![image.png](EduX%20Presentation/image%202.png)
    
    - English Devil (Vocab Game): like fighting game, if answer q correctly, can get golden coins to spend on equipment, atks
- Agent market
    - >15000 agents to trial, purchase
- Studio
    - Can develop from different templates, e.g. chatbot, app (more complex, app-oriented); also exists tutorials
    - Can also add API keys to link to existing subscriptions; configure KB; database; and create team in workspace management (invite team members, etc.)
- International cooperation
    - Doing joint research & practice in AI-powered teaching, learning with Cambridge, HKU, etc.
- How to showcase your application?
    - Post in forum, link accessible without account
- How to export agent?
    - Export JSON file, but can only run on TruFar platform, not on other platforms

Adaption

- Samaya
    - Helps create, fine-tune open-source models for finance
    - Many companies realizing that fine-tuning open-source results in much more effective & cheaper output
- What is the case for Adaption?
    - Main hindrances for fine-tuning: data and skillset
    - Data must be in specific format for fine-tuning, e.g. first col is problem stmt, second col is output, third col is reasoning; converting different formats e.g. Notion, pdfs, etc. into dataset is difficult
        - Invent Dataset: create new dataset based on scratch
        - Improve Data Quality: create dataset from unstructured documents
        - Can also expand existing datasets
    - Skillset rare
        - AutoScientist: auto-configs, trains best model for your task; asks questions e.g. what shd output data be like, can then download weights, upload to HF, Kaggle
            - Can also deploy on Adaption infra and get API key
    - Can also use credits to use models
    - Self-improvement: figure out where inefficiencies come in, change harness to be more cost-effective in long run
- How can Adaption help with edtech?
    - Worked w/ Singapore govt; many languages & cultures, including Tamil with special dialect; helped expand dataset, took care of missing data (had 20,000 rows, expanded to more), use to fine-tune SLM

Manifest

- What is the case for Manifest?
    
    ![image.png](EduX%20Presentation/image%203.png)
    
    - Like beginner-friendly Unity; above Kowloon Walled City made in 15 mins
    - Features include world generation, avatar creation, audio, geometry, images, 3D assets, lighting
    - /manifest-phone to add phone interaction functions, e.g. touch controls
    - Can add chat functions to avatars (but not AI-powered by default)
    - Can add scripts to assets (e.g. trains) to make it move, interactive
    - Can also download HTML file
- Limitations
    - No API yet
    - No coworking yet; work across one account

Ideas

-