import { SlashCommandBuilder } from 'discord.js';
import { Command, CommandContext } from '../../types/command.js';
import { spotifyCommand } from './spotifyCommand.js';

function createShortcut(
  name: string,
  description: string,
  subcommand: string,
  buildSlash?: (builder: SlashCommandBuilder) => void
): Command {
  const builder = new SlashCommandBuilder().setName(name).setDescription(description);
  if (buildSlash) {
    buildSlash(builder);
  }

  return {
    name,
    description,
    category: 'Musique',
    slashData: builder,
    async execute(ctx: CommandContext): Promise<void> {
      const syntheticArgs = [subcommand, ...ctx.args];
      const syntheticCtx = Object.create(ctx, {
        args: { value: syntheticArgs, writable: true },
      });
      await spotifyCommand.execute(syntheticCtx);
    },
  };
}

export const spotifyLoginCommand = createShortcut(
  'spotifylogin',
  'Associe votre compte Spotify avec le bot',
  'login'
);

export const spotifyLogoutCommand = createShortcut(
  'spotifylogout',
  'Dissocie votre compte Spotify du bot',
  'logout'
);

export const spotifyPlayCommand = createShortcut(
  'spotifyplay',
  'Lance ou reprend la lecture sur Spotify',
  'play',
  (builder) => {
    builder.addStringOption((opt) =>
      opt.setName('recherche').setDescription('Titre, artiste ou lien Spotify à lancer').setRequired(false)
    );
  }
);

export const spotifyPauseCommand = createShortcut(
  'spotifypause',
  'Met la lecture Spotify en pause',
  'pause'
);

export const spotifyResumeCommand = createShortcut(
  'spotifyresume',
  'Reprend la lecture Spotify',
  'resume'
);

export const spotifyNextCommand = createShortcut(
  'spotifynext',
  'Passe au titre suivant sur Spotify',
  'next'
);

export const spotifyPreviousCommand = createShortcut(
  'spotifyprevious',
  'Revient au titre précédent sur Spotify',
  'previous'
);

export const spotifyLikeCommand = createShortcut(
  'spotifylike',
  'Ajoute le titre Spotify en cours à vos favoris',
  'like'
);

export const spotifyUnlikeCommand = createShortcut(
  'spotifyunlike',
  'Retire le titre Spotify en cours de vos favoris',
  'unlike'
);

export const spotifyVcCommand = createShortcut(
  'spotifyvc',
  'Diffuse votre écoute Spotify dans votre salon vocal',
  'vc'
);

export const spotifyQueueCommand = createShortcut(
  'spotifyqueue',
  'Affiche votre file d\'attente Spotify',
  'queue',
  (builder) => {
    builder.addStringOption((opt) =>
      opt.setName('titre').setDescription('Titre ou lien Spotify à ajouter').setRequired(false)
    );
  }
);
