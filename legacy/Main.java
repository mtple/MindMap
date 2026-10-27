/*
* Matt Lee
* Mind Map: A Model of the Jungian Psyche
*/

import java.util.Scanner;

public class Main{
	
	// Create a Psyche object to represent the mind
	private static Psyche me = new Psyche();
	// Scanner object to take inout
	private static Scanner input = new Scanner(System.in);
	
	// Main method that runs game loop
	public static void main(String[] args) {
		welcome();
		gameLoop();
		
	}
	
	// Game loop runs as long as user does not choose quit
	private static void gameLoop() {
		boolean isRunning = true;
		while(isRunning) {
			me.display();
			String choice = input.next();
			if(choice.equals("q") || choice.equals("Q")) {
				isRunning = false;
			}
			me.changeRoom(choice);
		}
	}

	// Welcome message for start of the game	
	private static void welcome(){
        System.out.println("* * * * * * * * * * * * * * * * * * * *\n"
        +"Welcome to the Jungian model of the human psyche.\n"
        +"Explore at your leisure.\n"
        +"Press q to quit.\n"
        +"* * * * * * * * * * * * * ");
    }
	
}
	
	
