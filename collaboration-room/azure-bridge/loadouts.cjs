'use strict';

const teamRepo = 'Cos229-239/2610_Team02';
const members = {
    'svn-760': ['Malik', 'operations', 'MalikPersonal'],
    hyperrealmend: ['Omarion', 'reporting', 'OmarionPersonal'],
    daynaperezcolon: ['Dayna', 'interface', 'DaynaPersonal'],
    lopobunnie: ['William', 'forms', 'WilliamPersonal'],
    dulskinator96: ['Dan', 'integration', 'DanielPersonal']
};

// Each starter is a reproducible task. Its example and expected result are not a test receipt.
const projects = {
    shared: {
        name: 'Team workspace', accent: '#81b3ff', ref: 'dev',
        path: '', file: 'README.md', prior: 'Shared Team 02 repository',
        launch: 'Open the team repository in GitHub Desktop and select your editor.',
        starter: 'Add a team feature', sample: 'One example that exercises your change.',
        steps: 'Create a working branch from dev. Run your feature in its project.',
        expected: 'Describe the visible result for a teammate to verify.'
    },
    operations: {
        name: 'Operations desk', accent: '#78e0ba', ref: 'dev',
        path: 'TowerFlow Files/TowerFlow (Malik modified)', file: 'TowerFlowGUI.cpp',
        revision: '3ccaef64b27e2e16b1e4833ad3e9d337719662b8', prior: 'Windows inventory view and inventory operations',
        launch: 'Open this CMake folder in Visual Studio on Windows. Run run-tests.cmd for the parts and operations suites.',
        starter: 'Show a part in the inventory window', sample: 'A sample part named Desk Lamp with quantity 4.',
        steps: 'Create the sample part in a test inventory. Open the Windows inventory view and find Desk Lamp.',
        expected: 'The inventory window lists the part with quantity 4.'
    },
    reporting: {
        name: 'Inventory and reporting', accent: '#f1c37e', ref: 'dev',
        path: 'Towerflow_OW', file: 'TowerFlow.slnx',
        revision: '02922375a73e02ce16b4ab4440b2162b4a14cae8', prior: 'Stock movements, barcodes and inventory reports',
        launch: 'Open Towerflow_OW/TowerFlow.slnx in Visual Studio on Windows and press F5. Use a sample inventory file.',
        starter: 'Find a saved product by barcode', sample: 'Desk Lamp · barcode TF-CHECK-407 · price $12.50.',
        steps: 'Add the sample product with menu 1. Exit, reopen the same file, and scan the barcode with menu 8.',
        expected: 'The scan finds Desk Lamp with its original barcode and price.'
    },
    interface: {
        name: 'Interface workbench', accent: '#b8abff', ref: 'DaynaPersonal',
        path: '', file: 'DisplayHelper.h', revision: '7ba15b36369fb9872285604c87099030713b2b9e', prior: 'Shared console header',
        launch: 'Open DisplayHelper.h on DaynaPersonal. Choose the console screen that will call TowerDisplay::PrintHeader().',
        starter: 'Use the shared inventory header', sample: 'One inventory menu opening with valid and invalid input.',
        steps: 'Open the changed menu. Enter an invalid choice, then a valid choice.',
        expected: 'The TowerFlow header appears on the chosen screen and the user can recover from the invalid choice.'
    },
    forms: {
        name: 'Forms studio', accent: '#80caff', ref: 'WilliamPersonal',
        path: 'TowerFlowWindow/TowerFlowWinForm', file: 'TowerFlowWinForm.slnx',
        revision: 'cfd7df92ef08f6da6a247c51325574c5ea802174', prior: 'Editable parts grid and total stock in Windows Forms',
        launch: 'On Windows, open TowerFlowWindow/TowerFlowWinForm/TowerFlowWinForm.slnx in Visual Studio with .NET 10 desktop development. Press F5.',
        starter: 'Keep the parts grid and total stock in sync', sample: 'One test part with quantity 4. Edit it to 7.',
        steps: 'In the running Windows form, create the sample part. Record total stock. Edit only its quantity from 4 to 7.',
        expected: 'The grid shows 7 and total stock increases by 3.'
    },
    integration: {
        name: 'Integration desk', accent: '#82e4eb', ref: 'dev',
        path: 'TowerFlow', file: 'index.html', revision: '6b9391c2213397d620936fc3c56f9c76e2b93af4', prior: 'TowerFlow portfolio dashboard',
        launch: 'For the business app, select TowerFlow — Debug server / Codespaces in VS Code, press F5, and open port 4174. For the shared room, check the published revision below.',
        starter: 'Verify a reviewed feature inside the room', sample: 'One reviewed business-app PR and its expected result.',
        steps: 'Try the feature in the web preview. After the host publishes, compare the room receipt with the reviewed commit and repeat the steps.',
        expected: 'The business panel shows the reviewed behavior on the reported revision.'
    }
};

function sourceFile(file) {
    return typeof file === 'string' && !/(^|\/)(?:bin|obj|x64|debug|release|build|node_modules)\//i.test(file)
        && !/\.(?:designer\.generated|g|generated)\.cs$/i.test(file)
        && /\.(?:cs|slnx?|csproj|h|hpp|cpp|cxx|js|cjs|mjs|css|html|ps1|sh|cmake)$/i.test(file);
}
function area(file, fallback) {
    if (file.startsWith(projects.forms.path + '/')) return 'forms';
    if (file.startsWith(projects.operations.path + '/')) return 'operations';
    if (file.startsWith('Towerflow_OW/')) return 'reporting';
    if (/^(?:InputVailidation|DisplayHelper|InventoryStorage|Item|Logger)\.h$/i.test(file)) return 'interface';
    if (/^(?:collaboration-room|integrations|TowerFlow|tools)\//.test(file)) return 'integration';
    return fallback;
}
function workFromFiles(files, preferred) {
    const paths = files.filter(f => f.status !== 'removed' && sourceFile(f.filename)).map(f => f.filename);
    const own = paths.filter(f => area(f) === preferred);
    const candidates = own.length ? own : paths;
    const file = candidates.find(f => /\.(?:cs|cpp|js|cjs|mjs)$/i.test(f) && !/\.designer\.cs$/i.test(f)) ?? candidates[0];
    return file ? { project: area(file, preferred), file } : null;
}

async function recentWork(login, member, get) {
    const [, preferred, personal] = member;
    const issues = await get('/search/issues?' + new URLSearchParams({
        q: 'repo:' + teamRepo + ' is:pr is:open base:dev author:' + login, sort: 'updated', order: 'desc', per_page: 5
    }));
    for (const item of issues.items) {
        const number = item.number;
        const [pr, files] = await Promise.all([get('/pulls/' + number), get('/pulls/' + number + '/files?per_page=100')]);
        const work = workFromFiles(files, preferred);
        if (work && pr.state === 'open' && pr.base.ref === 'dev' && pr.head.repo && pr.user.login.toLowerCase() === login.toLowerCase()) {
            return {...work, type: 'pull', number, title: pr.title, ref: pr.head.ref, repo: pr.head.repo.full_name,
                revision: pr.head.sha, draft: Boolean(pr.draft),
                files: files.slice(0,100).map(f => ({path:f.filename, status:f.status}))};
        }
    }
    // Merge both histories by date so a stale personal branch cannot mask work already on dev.
    const histories = await Promise.all([...new Set(['dev', personal])].map(async ref => {
        try {
            const items = await get('/commits?' + new URLSearchParams({sha:ref, author:login, per_page:8}));
            return items.filter(c => c.parents.length <= 1).map(c => ({c, ref}));
        } catch (error) {
            if (error.status === 404 && ref !== 'dev') return [];
            throw error;
        }
    }));
    const candidates = histories.flat().sort((a,b) => Date.parse(b.c.commit.committer.date) - Date.parse(a.c.commit.committer.date));
    const seen = new Set();
    for (const {c,ref} of candidates) {
        if (seen.has(c.sha)) continue;
        seen.add(c.sha);
        const detail = await get('/commits/' + c.sha);
        const work = workFromFiles(detail.files, preferred);
        if (work) return {...work, type:'commit', title:c.commit.message.split('\n')[0], revision:c.sha, repo:teamRepo, ref};
    }
    return null;
}

function makeLoadouts(read = fetch, clock = Date.now) {
    const cache = new Map();
    return async function load(login, token) {
        const key = login.toLowerCase();
        const member = Object.hasOwn(members, key) ? members[key] : [login, 'shared', 'dev'];
        const cached = cache.get(key);
        if (cached && clock() < cached.until) return cached.promise;
        const promise = (async () => {
            const timer = AbortSignal.timeout(12000);
            const get = async route => {
                const url = 'https://api.github.com' + (route.startsWith('/search/') ? '' : '/repos/' + teamRepo) + route;
                const response = await read(url, {headers:{Authorization:'Bearer ' + token, Accept:'application/vnd.github+json',
                    'User-Agent':'TowerFlow-Azure-Desk'}, redirect:'error', signal:timer});
                if (!response.ok) throw Object.assign(Error('GitHub activity unavailable'), {status:response.status});
                return response.json();
            };
            const [activity, reviews] = await Promise.allSettled([
                recentWork(login, member, get),
                get('/pulls?state=open&base=dev&sort=updated&direction=desc&per_page=12')
            ]);
            const other = reviews.value?.find(pr => !pr.draft && pr.user.login.toLowerCase() !== key);
            const teamReview = other ? {number:other.number, title:other.title} : null;
            const available = activity.status === 'fulfilled', work = activity.value ?? null;
            return {checkedAt:clock(), teamReview, login, name:member[0], personalRef:member[2], defaultProject:member[1], projects, work, available};
        })();
        if (cache.size >= 100) cache.delete(cache.keys().next().value);
        cache.set(key, {until:clock()+60_000, promise});
        return promise;
    };
}

// Return published branches with work ahead of dev. Use only the signed-in member's
// named branch, workspace namespace, or branch with a tip they authored.
async function publishedBranches(login, token, read = fetch) {
    const headers = {Authorization:'Bearer '+token,'User-Agent':'TowerFlow-Azure-Desk','Content-Type':'application/json'};
    const signal = AbortSignal.timeout(10000);
    const response = await read('https://api.github.com/graphql',{method:'POST',headers,signal,redirect:'error',
        body:JSON.stringify({query:`query { repository(owner:"Cos229-239",name:"2610_Team02") {
            refs(refPrefix:"refs/heads/",first:100,orderBy:{field:TAG_COMMIT_DATE,direction:DESC}) {
                nodes {name target { ... on Commit {author {user {login}}} }}
            } } }`})});
    if (!response.ok) throw Error('Branch list unavailable');
    const graph = await response.json();
    const refs = graph.data?.repository?.refs?.nodes;
    if (!Array.isArray(refs)) throw Error('Branch list unavailable');
    const key = login.toLowerCase();
    const personal = members[key]?.[2];
    const candidates = refs.filter(r => r.name !== 'dev' && r.name !== 'main' &&
        (r.name === personal || r.name.toLowerCase().startsWith('work/'+key+'/') || r.target?.author?.user?.login?.toLowerCase() === key)).slice(0,8);
    const results = await Promise.all(candidates.map(async r => {
        const res = await read('https://api.github.com/repos/'+teamRepo+'/compare/dev...'+encodeURIComponent(r.name)+'?per_page=1',{headers,signal,redirect:'error'});
        if (!res.ok) return null;
        return (await res.json()).ahead_by > 0 ? r.name : null;
    }));
    return results.filter(Boolean);
}
module.exports = {publishedBranches, teamRepo, projects, sourceFile, workFromFiles, recentWork, makeLoadouts};
