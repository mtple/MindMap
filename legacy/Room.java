/*
* Matt Lee
* MindMap: A Model of the Jungian Psyche 
*/

// Room class represents a single section of the mind
public class Room{

    private String name;    
    private String description;

    // declare variables for each room
    private Room north;
    private Room east;
    private Room west;
    private Room south;
    
// Room constructor
    public Room(String name) {
    	this.name = name;
    }

   
   
    //Set room description 
    public void setDescription(String description) {
    	this.description = description;
    }
    // Set north location
    public void setNorth(Room north) {
    	 this.north = north;
    }
    // Set east location 
    public void setEast(Room east) {
    	this.east = east;
    }
    // Set west location
    public void setWest(Room west) {
    	this.west = west;
    }
    // Set south location 
    public void setSouth(Room south) {
    	this.south = south;
    }
    // Set all exits
    public void setExits(Room north, Room east, Room west, Room south) {
    	this.north = north;
    	this.west = west;
    	this.east = east;
    	this.south = south;
    }

    //Room Getters
    public Room getNorth() {
    	return this.north;
    }
    
    public Room getEast() {
    	return this.east;
    	
    }
    
    public Room getWest() {
    	return this.west;
    	
    }
    
    public Room getSouth() {
    	return this.south;
    }
    
    public String getDescription() {
    	return this.description;
    }
    
    public String getName() {
    	return this.name;
    }
  
    // Get all exits 
    public String getExits() {
    	String exits = "Exits are:\n";
    	if(north!=null) {
    		exits+=String.format("[N|n]orth to " + north.getName()+"\n");
    	}
    	else {
    		exits+=String.format("[N|n]orth to nowhere\n");
    	}
    	if(south!=null) {
    		exits+=String.format("[S|s]outh to %s", south.getName()+"\n");
    	}
    	else {
    		exits+=String.format("[S|s]outh to nowhere\n");
    	}
    	if(east!=null) {
    		exitvs+=String.format("[E|e]ast to %s",east.getName()+"\n");
    	}
    	else {
    		exits+=String.format("[E|e]ast to nowhere\n");
    	}
    	if(west!=null) {
    		exits+=String.format("[W|w]est to %s",west.getName()+"\n");
    	}
    	else {
    		exits+=String.format("[W|w]est to nowhere\n");
    	}
    	return exits;
    }

   // To String method
   public String toString() {
	  return getDescription()+"\n"+getExits();
   }
    
    
}


















