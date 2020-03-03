import { Toolkit } from 'actions-toolkit';
import { Octokit } from '@octokit/rest';

const tools = new Toolkit({
    event: 'issue_comment',
    secrets: ['GITHUB_TOKEN']
});

tools.command('merge', async (args, match) => {
    try {
        const issue = tools.context.payload.issue;
        const sender = tools.context.payload.sender;

        const senderName = sender?.login ?? ' Unknown Sender';
        const issueNumber = issue?.number;

        if (!issueNumber) {
            return tools.log.error('Issue number not defined.');
        }

        const isMergedResponse = await tools.github.pulls.checkIfMerged({
            ...tools.context.repo,
            pull_number: issueNumber
        });

        if (isMergedResponse.status !== 404) {
            console.log('PR is already merged');
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