import { Toolkit } from 'actions-toolkit';
import { Octokit } from '@octokit/rest';

const tools = new Toolkit({
    event: 'issue_comment'
});

tools.command('merge', async (args, match) => {
    const issue = tools.context.payload.issue;
    const sender = tools.context.payload.sender;

    const senderName = sender?.login ?? ' Unknown Sender';
    const issueNumber = issue?.number;

    if (!issueNumber) {
        return tools.log.error('Issue number not defined.');
    }

    const createCommentParams: Octokit.IssuesCreateCommentParams = {
        owner: tools.context.repo.owner,
        repo: tools.context.repo.repo,
        issue_number: issueNumber,
        body: `Merging PR based on approval from @${senderName}`
    }

    await tools.github.issues.createComment(createCommentParams)
})