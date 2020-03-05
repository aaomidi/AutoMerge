import { Toolkit } from 'actions-toolkit';
import { Octokit } from '@octokit/rest';


interface LabelDefinition {
    id: number,
    name: string
}


const tools = new Toolkit({
    event: 'issue_comment',
    secrets: ['GITHUB_TOKEN']
});

const labelToCheckFor = tools.inputs.label || 'Approved';

const fileToCheckFor = tools.inputs.filePath || '.github/mergers.json';


tools.command('merge', async (args, match) => {
    try {
        const issue = tools.context.payload.issue;

        if (issue?.pull_request === undefined) {
            console.log('This command only works on pull requests');
            return;
        }

        const sender = tools.context.payload.sender;

        const senderName = sender?.login ?? ' Unknown Sender';
        const issueNumber = issue?.number;

        if (!issueNumber) {
            return tools.log.error('Issue number not defined.');
        }

        let isMerged: boolean;
        try {
            const mergedResult = await tools.github.pulls.checkIfMerged({
                ...tools.context.repo,
                pull_number: issueNumber
            });
            isMerged = mergedResult.status === 204
        } catch (ex) {
            isMerged = false;
        }


        if (isMerged === true) {
            console.log('PR is already merged');
            return;
        }

        const mergers: string[] = JSON.parse(tools.getFile(fileToCheckFor));

        if (!mergers.includes(senderName)) {
            console.log('Unrecognized user tried to merge!', senderName);
            return;
        }

        const labels: LabelDefinition[] = issue.labels || [];

        const foundLabel = labels.find(l => l.name === labelToCheckFor);

        if (foundLabel === undefined) {
            console.log(`Label ${labelToCheckFor} must be applied`);
            const createCommentParams: Octokit.IssuesCreateCommentParams = {
                ...tools.context.repo,
                issue_number: issueNumber,
                body: `The label ${labelToCheckFor} is required for using this command.`
            }
            await tools.github.issues.createComment(createCommentParams);
            return;
        }

        const createCommentParams: Octokit.IssuesCreateCommentParams = {
            ...tools.context.repo,
            issue_number: issueNumber,
            body: `Merging PR based on approval from @${senderName}`
        }

        const commentResult = await tools.github.issues.createComment(createCommentParams);

        if (commentResult.status !== 201) {
            console.log('Comment not created');
            return;
        }

        const mergeResult = await tools.github.pulls.merge({
            ...tools.context.repo,
            pull_number: issueNumber,
            merge_method: 'squash'
        })
        console.log(mergeResult);
    } catch (ex) {
        console.error(ex);
    }
});

console.log('Running...')