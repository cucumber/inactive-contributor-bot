import { OctokitGitHub } from './OctokitGitHub'
import { getOctokit } from '@actions/github'
import { assertThat, equalTo, falsey, hasItem, is, not } from 'hamjest'

const org = 'test-inactive-contributor-action'

const testContributorsTeam = 'test-Contributors'
const testAlumniTeam = 'test-Alumni'
const testUser = 'blaisep'

describe(OctokitGitHub.name, () => {
  context('adding someone to a team', () => {
    beforeEach(async () => {
      const octokit = getOctokit(token())
      const gitHubClient = new OctokitGitHub(octokit, org)

      const initialMembers = await gitHubClient.getMembersOf(testAlumniTeam)
      for (const member of initialMembers) {
        await octokit.rest.teams.removeMembershipForUserInOrg({
          org,
          team_slug: testAlumniTeam,
          username: member,
        })
      }
    })

    it('adds a new member to a team', async () => {
      const gitHubClient = client()

      await gitHubClient.addUserToTeam(testUser, testAlumniTeam)
      const members = await gitHubClient.getMembersOf(testAlumniTeam)
      assertThat(members, hasItem(testUser))
    })

    it('says which members have been added to teams', async () => {
      const gitHubClient = client()
      const changes = gitHubClient.trackChanges().data
      assertThat(changes, equalTo([]))

      await gitHubClient.addUserToTeam(testUser, testAlumniTeam)
      assertThat(
        changes,
        equalTo([
          {
            action: 'add',
            user: testUser,
            team: testAlumniTeam,
          },
        ])
      )
    })
  })

  context('removing someone from the team', () => {
    it('removes an existing member from a team', async () => {
      // Given
      const gitHubClient = client()
      await gitHubClient.addUserToTeam(testUser, testContributorsTeam)
      const initialMembers = await gitHubClient.getMembersOf(
        testContributorsTeam
      )
      assertThat(initialMembers, hasItem(testUser))

      // When
      await gitHubClient.removeUserFromTeam(testUser, testContributorsTeam)

      // Then
      const members = await gitHubClient.getMembersOf(testContributorsTeam)
      assertThat(members, not(hasItem(testUser)))
    })

    it('says which members have been removed from teams', async () => {
      const gitHubClient = client()
      await gitHubClient.addUserToTeam(testUser, testContributorsTeam)
      const initialMembers = await gitHubClient.getMembersOf(
        testContributorsTeam
      )
      assertThat(initialMembers, hasItem(testUser))

      // When
      const changes = gitHubClient.trackChanges().data
      await gitHubClient.removeUserFromTeam(testUser, testContributorsTeam)

      // Then
      assertThat(
        changes,
        equalTo([
          { action: 'remove', user: testUser, team: testContributorsTeam },
        ])
      )
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

  context('team members', () => {
    it('gets members of a team', async () => {
      const gitHubClient = client()
      const members = await gitHubClient.getMembersOf('fishcakes')
      assertThat(members, equalTo([testUser, 'funficient']))
    })
  })

  context.only('null instance', () => {
    it('does not actually add user to team', async () => {
      const gitHubClient = OctokitGitHub.createNull()
      await gitHubClient.addUserToTeam(testUser, testAlumniTeam)
    })

    it('does not actually remove user from team', async () => {
      const gitHubClient = OctokitGitHub.createNull()
      await gitHubClient.removeUserFromTeam(testUser, testContributorsTeam)
    })

    it('by default, users have never made a commit', async () => {
      const gitHubClient = OctokitGitHub.createNull()
      assertThat(
        await gitHubClient.hasCommittedSince(testUser, new Date()),
        equalTo(false)
      )
    })

    it('by default, teams have no members', async () => {
      const gitHubClient = OctokitGitHub.createNull()
      assertThat(
        await gitHubClient.getMembersOf(testContributorsTeam),
        equalTo([])
      )
    })

    it('allows commit dates to be configured, and differently across multiple calls', async () => {
      const gitHubClient = OctokitGitHub.createNull({
        hasCommitted: [true, false, true],
      })
      assertThat(
        await gitHubClient.hasCommittedSince(testUser, new Date()),
        equalTo(true)
      )
      assertThat(
        await gitHubClient.hasCommittedSince(testUser, new Date()),
        equalTo(false)
      )
      assertThat(
        await gitHubClient.hasCommittedSince(testUser, new Date()),
        equalTo(true)
      )
    })

    it('allows team members to be configured, and differently across multiple calls', async () => {
      const gitHubClient = OctokitGitHub.createNull({
        teamMembers: [
          ['user1', 'user2'],
          ['user3', 'user4'],
        ],
      })

      assertThat(
        await gitHubClient.getMembersOf('irrelevant_team'),
        equalTo(['user1', 'user2'])
      )
      assertThat(
        await gitHubClient.getMembersOf('irrelevant_team'),
        equalTo(['user3', 'user4'])
      )
    })
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
