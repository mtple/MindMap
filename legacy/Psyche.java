/*
* Matt Lee
* Mind Map: A Model of the Jungian Psyche
*/

// Psyche class represents the player's mind, which contains many rooms
public class Psyche{
	
	// Declare room objectsi
	private Room self;
	private Room ego;
	private Room shadow;
	private Room personalSub;
	private Room collectiveUn;
	private Room current;//only used to point to already created rooms
	
        // Psyche constructor	
	public Psyche( ){
		instantiateRooms();
	
	//Method to display current room	
	public void display() {
		System.out.println(current.toString());
	}

   	//change current room based on string direction	
	public void changeRoom(String direction) {
		switch(direction) {
			case "n":case "N":{
				if(current.getNorth()!=null) {
					current = current.getNorth();
				}
			}break;
			case "e":case "E":{
				if(current.getEast()!=null) {
					current = current.getEast();
				}
			}break;
			case "w":case "W":{
				if(current.getWest()!=null) {
					current = current.getWest();
				}
			}break;
			case "s":case "S":{
				if(current.getSouth()!=null) {
					current = current.getSouth();
				}
			}break;
			case "q":case "Q":{
				 System.out.println("* * * * * * * * * *\n"
				 +"You have exited the simulation of Jung's model of the psyche,\n"
				 +"but you are trapped within your own conciousness for eternity.");
			}break;
			default:{System.out.println("Invalid Input");}
		}
	}
	
	// Instantiate Self as the starting room
	private void instantiateRooms() {
		self = new Room("Self");
		ego = new Room("Ego");
		shadow = new Room("Shadow");
		personalSub = new Room("Personal Subconcious");
		collectiveUn = new Room("Collective Unconcious");
		current = self;
		
	}
	
	// Describes the current room to the player
	private void setRoomDescription(){
		self.setDescription("You are in the self. This is the sum total of your psyche.");
		ego.setDescription("You are in the ego, where your concious awareness resides.");
		shadow.setDescription("You are the shadow, which is made up of traits you dislike.");
		personalSub.setDescription("You are in the personal subconcious, where you store thoughts\n"
								  +"and experiences that you are not aware of.");
		collectiveUn.setDescription("You are in the collective unconcious, the section of your subconcious\n"
								  +"which is derived from ancestral memory and common to all humankind.");
	}
	
	// Sets exits for each room, making up the spatial relationships between rooms
	private void setRoomExits() {
		self.setExits(ego,ego,shadow,shadow);
		ego.setExits(personalSub,personalSub,personalSub,self);
		shadow.setExits(self,collectiveUn,collectiveUn,collectiveUn);
		personalSub.setExits(null,ego,ego,ego);
		collectiveUn.setExits(shadow,shadow,shadow,null);
	}
	
	
	
	
	
	
	
	
	
}
