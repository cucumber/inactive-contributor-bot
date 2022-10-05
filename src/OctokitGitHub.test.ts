import { OctokitGitHub } from './OctokitGitHub'
import { getOctokit } from '@actions/github'
import {
  assertThat,
  equalTo,
  falsey,
  hasItem,
  instanceOf,
  is,
  not,
  promiseThat,
  throws,
} from 'hamjest'
import { UnableToGetMembersError } from './Errors'
import assert from 'assert'

// This really exists on GitHub
const org = 'test-inactive-contributor-action'

describe(OctokitGitHub.name, () => {
  context('adding someone to a team', () => {
    it('adds a new member to a team', async () => {
      const octokit = getOctokit(token())
      const gitHubClient = new OctokitGitHub(octokit, org)
      const teamSlug = 'test-Alumni'
      const initialMembers = await gitHubClient.getMembersOf(teamSlug)
      for (const member of initialMembers) {
        await octokit.rest.teams.removeMembershipForUserInOrg({
          org,
          team_slug: teamSlug,
          username: member,
        })
      }
      await gitHubClient.addUserToTeam('blaisep', teamSlug)
      const members = await gitHubClient.getMembersOf(teamSlug)
      assertThat(members, hasItem('blaisep'))
    })
  })

  context('removing someone from the team', () => {
    it('removes an existing member from a team', async () => {
      // Given
      const gitHubClient = client()
      const teamSlug = 'test-Contributors'
      await gitHubClient.addUserToTeam('blaisep', teamSlug)
      const initialMembers = await gitHubClient.getMembersOf(teamSlug)
      assertThat(initialMembers, hasItem('blaisep'))

      // When
      await gitHubClient.removeUserFromTeam('blaisep', teamSlug)

      // Then
      const members = await gitHubClient.getMembersOf(teamSlug)
      assertThat(members, not(hasItem('blaisep')))
    })
  })

  context('working out if a user has committed recently', () => {
    it('returns false if they have not', async () => {
      const gitHubClient = client()
      const hasCommitted = await gitHubClient.hasCommittedSince(
        'olleolleolle',
        new Date()
      )
      assertThat(hasCommitted, is(falsey()))
    })

    it('returns true if they have', async () => {
      const gitHubClient = client()
      const dateOnWhichMattCommitted = new Date(2022, 3, 1) // April 1.
      const hasCommitted = await gitHubClient.hasCommittedSince(
        'mattwynne',
        dateOnWhichMattCommitted
      )
      assertThat(hasCommitted, is(true))
    })
  })

  it('gets members of a team', async () => {
    const gitHubClient = client()
    const members = await gitHubClient.getMembersOf('fishcakes')
    assertThat(members, equalTo(['blaisep', 'funficient']))
  })

  it.skip('throws a useful error when trying to get members of a non-existent org', async () => {
    // TODO: make this pass
    const org = 'non-existent-org'
    const octokit = getOctokit(token())
    const gitHubClient = new OctokitGitHub(octokit, org)
    const gettingMembers = gitHubClient.getMembersOf('fishcakes')
    await assert.rejects(gettingMembers, UnableToGetMembersError)
  })
})

function token() {
  const token = process.env.GITHUB_TOKEN
  if (!token) {
    throw new Error(
      'Please set GITHUB_TOKEN. See https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token'
    )
  }
  return token
}

function client() {
  const octokit = getOctokit(token())
  return new OctokitGitHub(octokit, org)
}
